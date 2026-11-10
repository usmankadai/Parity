import { describe, expect, it } from 'vitest';
import { createSourcesSplitter } from '../sourcesSplitter';

function run(pieces: string[]) {
  const splitter = createSourcesSplitter();
  const shown = pieces.map((piece) => splitter.push(piece)).join('');
  const end = splitter.end();
  return { shown: shown + end.text, rowIds: end.rowIds };
}

describe('createSourcesSplitter', () => {
  it('shows the answer and keeps the sources block back', () => {
    expect(run(['Germany has 20 days.\n', '<sources>DE-annual-leave</sources>'])).toEqual({
      shown: 'Germany has 20 days.\n',
      rowIds: ['DE-annual-leave'],
    });
  });

  it('catches a tag split across pieces', () => {
    expect(run(['Answer. <sou', 'rces>GB-pension, IE-pension</sou', 'rces>'])).toEqual({
      shown: 'Answer. ',
      rowIds: ['GB-pension', 'IE-pension'],
    });
  });

  it('shows text that only looked like the start of a tag', () => {
    expect(run(['Use <so', 'me caution.'])).toEqual({ shown: 'Use <some caution.', rowIds: [] });
  });

  it('handles no sources block, an empty one, and a missing closing tag', () => {
    expect(run(['Just an answer.'])).toEqual({ shown: 'Just an answer.', rowIds: [] });
    expect(run(['Nothing found.\n<sources></sources>'])).toEqual({
      shown: 'Nothing found.\n',
      rowIds: [],
    });
    expect(run(['A.<sources>GB-pension'])).toEqual({ shown: 'A.', rowIds: ['GB-pension'] });
  });

  it('removes repeated IDs', () => {
    expect(run(['A.<sources>GB-pension,GB-pension</sources>']).rowIds).toEqual(['GB-pension']);
  });
});
