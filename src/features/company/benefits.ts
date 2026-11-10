import type { CompanyBenefitId } from '../../api/types';

export interface CompanyBenefitCategory {
  id: CompanyBenefitId;
  label: string;
}

/** Benefits with no legal minimum, shown in their own section of the company view. */
export const COMPANY_BENEFITS: readonly CompanyBenefitCategory[] = [
  { id: 'private-health', label: 'Private health insurance' },
  { id: 'wellbeing-allowance', label: 'Gym and wellbeing allowance' },
  { id: 'employee-assistance', label: 'Employee assistance programme' },
];
