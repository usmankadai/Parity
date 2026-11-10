import { describe, expect, it } from 'vitest';
import type { AskStreamEvent } from '../../../src/api/types';
import { parseBenefitRows } from '../../../src/api/validate';
import { parseCompanies } from '../../../src/api/validateCompany';
import benefits from '../../../src/mocks/fixtures/benefits.json';
import { companies } from '../../../src/mocks/fixtures/companies';
import { handleAsk, type AskDeps, type ModelEvent, type ModelRequest } from '../handleAsk';
import { buildUserMessage, SYSTEM_PROMPT } from '../prompt';
import { clientIp, createRateLimiter } from '../rateLimit';

const rows = parseBenefitRows(benefits).filter((r) => ['IE', 'DE'].includes(r.countryCode));
const northwind = parseCompanies(companies)[0];
if (!northwind) throw new Error('fixture missing');

const askBody = {
  question: 'Where is our package below the legal minimum?',
  countries: ['IE', 'DE'],
  rows,
  company: {
    id: northwind.id,
    name: northwind.name,
    figures: northwind.figures.filter((f) => ['IE', 'DE'].includes(f.countryCode)),
    benefits: northwind.benefits.filter((b) => ['IE', 'DE'].includes(b.countryCode)),
  },
};

function post(body: unknown) {
  return new Request('https://parity.test/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function fakeModel(events: ModelEvent[] | Error) {
  const calls: ModelRequest[] = [];
  async function* streamModel(request: ModelRequest): AsyncIterable<ModelEvent> {
    calls.push(request);
    await Promise.resolve();
    if (events instanceof Error) throw events;
    yield* events;
  }
  return { streamModel, calls };
}

function deps(overrides: Partial<AskDeps> = {}): AskDeps & { logs: string[] } {
  const logs: string[] = [];
  return {
    env: { apiKey: 'test-key', model: 'claude-opus-5-5' },
    streamModel: fakeModel([{ type: 'end', stopReason: 'end_turn' }]).streamModel,
    rateLimit: () => ({ allowed: true }),
    logError: (message) => logs.push(message),
    logs,
    ...overrides,
  };
}

async function readEvents(response: Response): Promise<AskStreamEvent[]> {
  const text = await response.text();
  return text
    .split('\n\n')
    .filter(Boolean)
    .map((frame) => JSON.parse(frame.replace(/^data: /, '')) as AskStreamEvent);
}

describe('handleAsk', () => {
  it('streams the answer, hides the sources block, and keeps only cited IDs that were sent', async () => {
    const model = fakeModel([
      { type: 'text', text: 'Ireland gives 1 week, below the 2-week minimum.\n<sour' },
      {
        type: 'text',
        text: 'ces>northwind-IE-notice-period,IE-notice-period,FR-made-up</sources>',
      },
      { type: 'end', stopReason: 'end_turn' },
    ]);
    const d = deps({ streamModel: model.streamModel });

    const response = await handleAsk(post(askBody), d);
    const events = await readEvents(response);

    expect(response.headers.get('content-type')).toBe('text/event-stream');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(events).toEqual([
      { type: 'chunk', text: 'Ireland gives 1 week, below the 2-week minimum.\n' },
      { type: 'sources', rowIds: ['northwind-IE-notice-period', 'IE-notice-period'] },
      { type: 'done' },
    ]);
    expect(d.logs).toEqual(['ask: dropped 1 cited ID(s) that were not sent']);
  });

  it('sends the cached system prompt, and the data and question in the user message', async () => {
    const model = fakeModel([{ type: 'end', stopReason: 'end_turn' }]);
    await (await handleAsk(post(askBody), deps({ streamModel: model.streamModel }))).text();

    const [call] = model.calls;
    expect(call?.model).toBe('claude-opus-5-5');
    expect(call?.system).toBe(SYSTEM_PROMPT);
    expect(call?.user).toContain('"id": "northwind-IE-notice-period"');
    expect(call?.user).toContain('"gap": "Below minimum (non-compliant)"');
    expect(call?.user).toContain('<question>\nWhere is our package below the legal minimum?');
  });

  it('turns a refusal into an error event, without sources', async () => {
    const model = fakeModel([{ type: 'end', stopReason: 'refusal' }]);
    const events = await readEvents(
      await handleAsk(post(askBody), deps({ streamModel: model.streamModel })),
    );
    expect(events).toEqual([
      { type: 'error', message: 'The assistant could not answer that question.' },
    ]);
  });

  it('never forwards the upstream error message', async () => {
    const model = fakeModel(new Error('upstream secret detail: key sk-ant-123'));
    const d = deps({ streamModel: model.streamModel });
    const events = await readEvents(await handleAsk(post(askBody), d));

    expect(events).toEqual([
      { type: 'error', message: 'The assistant is unavailable. Please try again.' },
    ]);
    expect(JSON.stringify(events)).not.toContain('sk-ant');
    expect(d.logs.join(' ')).not.toContain('sk-ant');
  });

  it('rejects requests before calling the model', async () => {
    const model = fakeModel([]);
    const d = deps({ streamModel: model.streamModel });

    expect((await handleAsk(post('not json'), d)).status).toBe(400);
    expect((await handleAsk(post({ ...askBody, question: '' }), d)).status).toBe(400);
    expect((await handleAsk(post({ ...askBody, countries: ['FR'] }), d)).status).toBe(400);
    expect((await handleAsk(post({ ...askBody, question: 'x'.repeat(250_000) }), d)).status).toBe(
      413,
    );
    expect(model.calls).toHaveLength(0);
  });

  it('fails clearly, without details, when the key or model is not configured', async () => {
    const response = await handleAsk(
      post(askBody),
      deps({ env: { apiKey: undefined, model: 'm' } }),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: 'The assistant is not configured.' });
  });

  it('rate limits by IP and says when to retry', async () => {
    const response = await handleAsk(
      post(askBody),
      deps({ rateLimit: () => ({ allowed: false, retryAfterSeconds: 42 }) }),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('42');
  });
});

describe('createRateLimiter', () => {
  it('allows up to the limit in the window, then frees up as time passes', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.check('a', 0).allowed).toBe(true);
    expect(limiter.check('a', 100).allowed).toBe(true);
    expect(limiter.check('a', 200)).toEqual({ allowed: false, retryAfterSeconds: 1 });
    expect(limiter.check('b', 200).allowed).toBe(true);
    expect(limiter.check('a', 1001).allowed).toBe(true);
  });

  it('reads the first forwarded IP', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe(
      '203.0.113.7',
    );
    expect(clientIp(new Headers())).toBe('unknown');
  });
});

describe('prompt', () => {
  it('keeps request data out of the cached system prompt', () => {
    expect(SYSTEM_PROMPT).not.toContain('Northwind');
    expect(SYSTEM_PROMPT).toContain('<sources>');
  });

  it('labels the company as fictional and works out each gap', () => {
    const message = buildUserMessage({
      question: 'Q',
      countries: ['DE'],
      rows: rows.filter((r) => r.countryCode === 'DE'),
      company: {
        id: northwind.id,
        name: northwind.name,
        figures: northwind.figures.filter((f) => f.countryCode === 'DE'),
        benefits: [],
      },
    });
    expect(message).toContain('Northwind Logistics (fictional)');
    expect(message).toContain('"gap": "Above minimum (no legal minimum)"');
    expect(message).toContain('"gap": "Not compared"');
  });
});
