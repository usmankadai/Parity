import type { CategoryId, CompanyBenefitId, CountryCode } from './types.js';

/** Citation ID for a company's figure, for example "northwind-IE-notice-period". */
export function companyFigureId(companyId: string, countryCode: CountryCode, category: CategoryId) {
  return `${companyId}-${countryCode}-${category}`;
}

/** Citation ID for a company-only benefit, for example "northwind-GB-private-health". */
export function companyBenefitId(
  companyId: string,
  countryCode: CountryCode,
  benefit: CompanyBenefitId,
) {
  return `${companyId}-${countryCode}-${benefit}`;
}
