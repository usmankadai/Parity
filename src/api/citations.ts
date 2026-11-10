import { companyBenefitId, companyFigureId } from './companyIds';
import type { AskRequest } from './types';

/**
 * Every row ID an answer may cite: the statutory rows sent, and the company's
 * figures and benefits when they were sent. Shared by the browser (which only
 * shows chips for these) and the proxy (which drops any other cited ID).
 */
export function citableIds(request: Omit<AskRequest, 'question'>): Set<string> {
  const ids = new Set(request.rows.map((row) => row.id));
  const { company } = request;
  if (company) {
    for (const f of company.figures) {
      ids.add(companyFigureId(company.id, f.countryCode, f.category));
    }
    for (const b of company.benefits) {
      ids.add(companyBenefitId(company.id, b.countryCode, b.benefit));
    }
  }
  return ids;
}
