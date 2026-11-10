import {
  CATEGORY_IDS,
  COMPANY_BENEFIT_IDS,
  SOURCE_UNITS,
  type Company,
  type CompanyBenefit,
  type CompanyFigure,
  type CountryCode,
} from './types';
import {
  InvalidResponseError,
  isCountryCode,
  isOneOf,
  isRecord,
  requireArray,
  requireString,
} from './validate';

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;
export const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function fail(where: string, message: string): never {
  throw new InvalidResponseError(`${where}: ${message}`);
}

export function parseCompanyFigure(
  item: unknown,
  where: string,
  countries: Set<CountryCode>,
): CompanyFigure {
  if (!isRecord(item)) fail(where, 'expected an object');
  const { countryCode, category, amount, unit } = item;
  if (!isCountryCode(countryCode) || !countries.has(countryCode)) {
    fail(where, 'country is not one of the company’s countries');
  }
  if (!isOneOf(CATEGORY_IDS, category)) fail(where, 'unknown category');

  // A figure has both an amount and a unit, or neither (a policy with no single number).
  const hasAmount = typeof amount === 'number' && Number.isFinite(amount) && amount >= 0;
  if (
    hasAmount !== isOneOf(SOURCE_UNITS, unit) ||
    (!hasAmount && (amount !== null || unit !== null))
  ) {
    fail(where, 'needs a non-negative amount with a known unit, or neither');
  }

  return {
    countryCode,
    category,
    amount: hasAmount ? amount : null,
    unit: hasAmount && isOneOf(SOURCE_UNITS, unit) ? unit : null,
    summary: requireString(item, 'summary', where),
  };
}

export function parseCompanyBenefit(
  item: unknown,
  where: string,
  countries: Set<CountryCode>,
): CompanyBenefit {
  if (!isRecord(item)) fail(where, 'expected an object');
  const { countryCode, benefit, provided } = item;
  if (!isCountryCode(countryCode) || !countries.has(countryCode)) {
    fail(where, 'country is not one of the company’s countries');
  }
  if (!isOneOf(COMPANY_BENEFIT_IDS, benefit)) fail(where, 'unknown benefit');
  if (typeof provided !== 'boolean') fail(where, '"provided" should be true or false');
  return { countryCode, benefit, provided, summary: requireString(item, 'summary', where) };
}

function parseCompany(item: unknown, index: number): Company {
  const where = `companies[${index}]`;
  if (!isRecord(item)) fail(where, 'expected an object');

  const id = requireString(item, 'id', where);
  if (!SLUG.test(id)) fail(where, 'id should be lower-case words joined by hyphens');

  const theme = item.theme;
  if (!isRecord(theme)) fail(where, 'theme should be an object');
  const brand = requireString(theme, 'brand', `${where}.theme`);
  const brandWash = requireString(theme, 'brandWash', `${where}.theme`);
  if (!HEX_COLOUR.test(brand) || !HEX_COLOUR.test(brandWash)) {
    fail(where, 'theme colours should be six-digit hex colours');
  }

  const countries = requireArray(item.countries, `${where}.countries`).map((entry, i) => {
    const at = `${where}.countries[${i}]`;
    if (!isRecord(entry)) fail(at, 'expected an object');
    const { code, headcount } = entry;
    if (!isCountryCode(code)) fail(at, 'unknown country code');
    if (typeof headcount !== 'number' || !Number.isInteger(headcount) || headcount < 0) {
      fail(at, 'headcount should be a whole number');
    }
    return { code, headcount };
  });
  if (countries.length === 0) fail(where, 'a company needs at least one country');
  const codes = new Set(countries.map((country) => country.code));
  if (codes.size !== countries.length) fail(where, 'countries are repeated');

  const figures = requireArray(item.figures, `${where}.figures`).map((figure, i) =>
    parseCompanyFigure(figure, `${where}.figures[${i}]`, codes),
  );
  const benefits = requireArray(item.benefits, `${where}.benefits`).map((benefit, i) =>
    parseCompanyBenefit(benefit, `${where}.benefits[${i}]`, codes),
  );

  const figureKeys = figures.map((f) => `${f.countryCode}-${f.category}`);
  const benefitKeys = benefits.map((b) => `${b.countryCode}-${b.benefit}`);
  if (new Set(figureKeys).size !== figureKeys.length) fail(where, 'a figure is repeated');
  if (new Set(benefitKeys).size !== benefitKeys.length) fail(where, 'a benefit is repeated');

  return {
    id,
    name: requireString(item, 'name', where),
    industry: requireString(item, 'industry', where),
    theme: { brand, brandWash },
    countries,
    figures,
    benefits,
  };
}

export function parseCompanies(value: unknown): Company[] {
  const companies = requireArray(value, 'companies').map(parseCompany);
  const ids = companies.map((company) => company.id);
  if (new Set(ids).size !== ids.length) fail('companies', 'ids are repeated');
  return companies;
}
