import { http } from 'msw';
import { validateAskRequest } from '../api/askValidation';
import { composeAnswer, toStreamEvents } from './askAnswer';
import { sseResponse } from './sse';

/**
 * Handlers used only in tests, with server.use(). Never in the scenario
 * switcher: their effect (a chip that does not appear) is not visible in a demo.
 */

/** Answers normally, but also cites a row ID that was never sent. */
export const citesUnknownRow = http.post('*/api/ask', async ({ request }) => {
  const validation = validateAskRequest(await request.json());
  if (!validation.ok) throw new Error(validation.message);
  const answer = composeAnswer(validation.request);
  return sseResponse(toStreamEvents({ ...answer, rowIds: [...answer.rowIds, 'FR-made-up-row'] }));
});
