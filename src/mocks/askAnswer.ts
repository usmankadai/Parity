import type { AskRequest, AskStreamEvent, CategoryId } from '../api/types';
import { CATEGORIES } from '../features/comparison/categories';
import countries from './fixtures/countries.json';

// A scripted stand-in for the AI in mock mode. It builds its answer only from
// the rows in the request, so it can never invent a figure, and it cites the
// rows it used, like the real assistant must.

const TOPICS: { pattern: RegExp; categories: CategoryId[] }[] = [
  {
    pattern: /parental|maternity|mother|birth|baby/i,
    categories: ['maternity-leave', 'paternity-leave'],
  },
  { pattern: /paternity|father|partner/i, categories: ['paternity-leave'] },
  { pattern: /sick|ill(ness)?\b/i, categories: ['sick-pay'] },
  { pattern: /pension|retire/i, categories: ['pension'] },
  { pattern: /notice|dismiss|redundan/i, categories: ['notice-period'] },
  { pattern: /public holiday|bank holiday/i, categories: ['public-holidays'] },
  { pattern: /leave|holiday|vacation|days off/i, categories: ['annual-leave'] },
];

function topicsFor(question: string): CategoryId[] {
  return TOPICS.find((topic) => topic.pattern.test(question))?.categories ?? [];
}

const countryName = (code: string) => countries.find((c) => c.code === code)?.name ?? code;
const categoryLabel = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

export interface ScriptedAnswer {
  text: string;
  rowIds: string[];
}

export function composeAnswer({ question, rows }: AskRequest): ScriptedAnswer {
  const categories = topicsFor(question);
  const used = rows.filter((row) => categories.includes(row.category));

  if (used.length === 0) {
    return {
      text: 'The data on screen does not cover that question. Try asking about annual leave, public holidays, parental leave, sick pay, pensions or notice periods.',
      rowIds: [],
    };
  }

  const lines = used.map((row) => {
    const value =
      row.status === 'no_statutory_minimum'
        ? `no legal minimum (${row.sourceValue})`
        : row.sourceValue;
    return `${countryName(row.countryCode)}, ${categoryLabel(row.category).toLowerCase()}: ${value}.`;
  });

  return {
    text: [
      'Here is what the data on screen says.',
      ...lines,
      'These are statutory minimums, so an employer can offer more. This is not legal advice.',
    ].join('\n\n'),
    rowIds: used.map((row) => row.id),
  };
}

/** Splits an answer into small chunks, keeping spaces and paragraph breaks, so it streams like a model. */
export function toStreamEvents({ text, rowIds }: ScriptedAnswer): AskStreamEvent[] {
  const pieces = text.match(/\S+\s*/g) ?? [];
  const chunks: AskStreamEvent[] = [];
  for (let i = 0; i < pieces.length; i += 3) {
    chunks.push({ type: 'chunk', text: pieces.slice(i, i + 3).join('') });
  }
  return [...chunks, { type: 'sources', rowIds }, { type: 'done' }];
}
