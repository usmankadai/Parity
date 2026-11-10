// Compiles the AI proxy the way Vercel does (each file on its own, Node's
// module rules, no bundler) and calls it with no API key configured. It must
// answer with a clear 500, not crash: a crash here means the function would
// fail to load in production (FUNCTION_INVOCATION_FAILED).
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const OUT = '.api-check';
rmSync(OUT, { recursive: true, force: true });
execFileSync('npx', ['tsc', '-p', 'tsconfig.api.json', '--noEmit', 'false', '--outDir', OUT], {
  stdio: 'inherit',
});

delete process.env.ANTHROPIC_API_KEY;
delete process.env.ANTHROPIC_MODEL;

const mod = (await import(pathToFileURL(join(process.cwd(), OUT, 'api', 'ask.js')).href)) as {
  POST: (request: Request) => Promise<Response>;
};
const response = await mod.POST(
  new Request('https://parity.test/api/ask', { method: 'POST', body: '{}' }),
);
const body = (await response.json()) as { message?: string };
rmSync(OUT, { recursive: true, force: true });

if (response.status !== 500 || body.message !== 'The assistant is not configured.') {
  console.error(`API smoke test failed: ${response.status} ${JSON.stringify(body)}`);
  process.exit(1);
}
console.log('API smoke test passed: the function loads in Node and fails safely without a key.');
