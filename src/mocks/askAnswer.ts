import { companyBenefitId, companyFigureId } from '../api/companyIds';
import {
  COMPANY_BENEFIT_IDS,
  type AskCompanyContext,
  type AskRequest,
  type AskStreamEvent,
  type BenefitRow,
  type CategoryId,
  type CompanyBenefitId,
  type CompanyFigure,
} from '../api/types';
import { COMPANY_BENEFITS } from '../features/company/benefits';
import { compareToMinimum, GAP_LABELS, type Gap } from '../features/company/gap';
import { CATEGORIES } from '../features/comparison/categories';
import { normalise, normaliseAmount } from '../features/comparison/normalise';
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

const DISCLAIMER = 'This is not legal advice.';

/** "the transport sector's fund" → "the transport sector's fund", but "25 days" stays as it is. */
function lowerFirst(text: string): string {
  return /^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function statutoryValue(row: BenefitRow): string {
  return row.status === 'no_statutory_minimum'
    ? `no legal minimum (${row.sourceValue})`
    : row.sourceValue;
}

/** The gap between a company figure and its legal minimum, as the table shows it. */
function gapFor(row: BenefitRow, figure: CompanyFigure): Gap {
  const category = CATEGORIES.find((c) => c.id === row.category);
  if (!category) return 'not-compared';
  return compareToMinimum({
    status: row.status,
    minimum: normalise(row, category.displayUnit),
    companyValue:
      figure.amount !== null && figure.unit !== null
        ? normaliseAmount(figure.amount, figure.unit, category.displayUnit, row.id)
        : null,
    comparable: category.comparable,
  });
}

const OWN_PACKAGE = /\b(our|we|us)\b|package|company/i;
const GAP_WORDS = /below|gap|complian|short|under/i;
const BENEFIT_TOPICS: { pattern: RegExp; benefits: CompanyBenefitId[] }[] = [
  { pattern: /health|medical/i, benefits: ['private-health'] },
  { pattern: /gym|wellbeing|wellness|fitness/i, benefits: ['wellbeing-allowance'] },
  { pattern: /assistance|support line|\beap\b|counsell/i, benefits: ['employee-assistance'] },
  { pattern: /perk|extra|company benefit/i, benefits: [...COMPANY_BENEFIT_IDS] },
];

/** "Where is our package below the legal minimum?" */
function gapAnswer(company: AskCompanyContext, rows: BenefitRow[]): ScriptedAnswer {
  const below = company.figures.flatMap((figure) => {
    const row = rows.find(
      (r) => r.countryCode === figure.countryCode && r.category === figure.category,
    );
    return row && gapFor(row, figure) === 'below' ? [{ row, figure }] : [];
  });

  if (below.length === 0) {
    return {
      text: [
        `${company.name} meets or beats the legal minimum in every compared category for the countries on screen.`,
        'Sick pay is not compared, because pay rates and who pays differ too much.',
        DISCLAIMER,
      ].join('\n\n'),
      rowIds: [],
    };
  }

  return {
    text: [
      `Here is where ${company.name} is below the legal minimum, using the data on screen.`,
      ...below.map(
        ({ row, figure }) =>
          `${countryName(row.countryCode)}, ${categoryLabel(row.category).toLowerCase()}: ${company.name} gives ${lowerFirst(figure.summary)}. The legal minimum is ${lowerFirst(row.sourceValue)}.`,
      ),
      'Everything else compared meets or beats the minimum. Sick pay is not compared, because pay rates and who pays differ too much.',
      DISCLAIMER,
    ].join('\n\n'),
    rowIds: below.flatMap(({ row, figure }) => [
      companyFigureId(company.id, figure.countryCode, figure.category),
      row.id,
    ]),
  };
}

/** "Which countries don't offer private health insurance?" */
function benefitAnswer(company: AskCompanyContext, wanted: CompanyBenefitId[]): ScriptedAnswer {
  const used = company.benefits.filter((benefit) => wanted.includes(benefit.benefit));
  const label = (id: CompanyBenefitId) =>
    COMPANY_BENEFITS.find((b) => b.id === id)?.label.toLowerCase() ?? id;

  return {
    text: [
      `Here is what ${company.name} offers, using the data on screen. These benefits have no legal minimum.`,
      ...used.map(
        (benefit) =>
          `${countryName(benefit.countryCode)}, ${label(benefit.benefit)}: ${benefit.provided ? 'offered' : 'not offered'} (${lowerFirst(benefit.summary)}).`,
      ),
    ].join('\n\n'),
    rowIds: used.map((benefit) =>
      companyBenefitId(company.id, benefit.countryCode, benefit.benefit),
    ),
  };
}

export function composeAnswer({ question, rows, company }: AskRequest): ScriptedAnswer {
  if (company) {
    if (OWN_PACKAGE.test(question) && GAP_WORDS.test(question)) return gapAnswer(company, rows);
    const benefits = BENEFIT_TOPICS.find((topic) => topic.pattern.test(question))?.benefits;
    if (benefits) return benefitAnswer(company, benefits);
  }

  const categories = topicsFor(question);
  const used = rows.filter((row) => categories.includes(row.category));

  if (used.length === 0) {
    return {
      text: 'The data on screen does not cover that question. Try asking about annual leave, public holidays, parental leave, sick pay, pensions or notice periods.',
      rowIds: [],
    };
  }

  if (!company) {
    return {
      text: [
        'Here is what the data on screen says.',
        ...used.map(
          (row) =>
            `${countryName(row.countryCode)}, ${categoryLabel(row.category).toLowerCase()}: ${statutoryValue(row)}.`,
        ),
        `These are statutory minimums, so an employer can offer more. ${DISCLAIMER}`,
      ].join('\n\n'),
      rowIds: used.map((row) => row.id),
    };
  }

  // With a company: each legal minimum, then what the company gives and how it compares.
  const rowIds: string[] = [];
  const lines = used.map((row) => {
    rowIds.push(row.id);
    const where = `${countryName(row.countryCode)}, ${categoryLabel(row.category).toLowerCase()}`;
    const figure = company.figures.find(
      (f) => f.countryCode === row.countryCode && f.category === row.category,
    );
    if (!figure) return `${where}: the legal minimum is ${lowerFirst(statutoryValue(row))}.`;
    rowIds.push(companyFigureId(company.id, figure.countryCode, figure.category));
    return `${where}: the legal minimum is ${lowerFirst(statutoryValue(row))}. ${company.name} gives ${lowerFirst(figure.summary)} (${GAP_LABELS[gapFor(row, figure)].toLowerCase()}).`;
  });

  return {
    text: ['Here is what the data on screen says.', ...lines, DISCLAIMER].join('\n\n'),
    rowIds,
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
