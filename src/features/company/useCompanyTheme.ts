import { useEffect } from 'react';
import type { Company } from '../../api/types';

/**
 * Re-themes the workspace from the company's config by setting the brand
 * tokens on the root element. CSSOM changes like this are allowed by the
 * Content Security Policy (inline style attributes would not be). Colours are
 * checked for contrast by a test before any company ships.
 */
export function useCompanyTheme(company: Company | null) {
  useEffect(() => {
    const root = document.documentElement.style;
    if (!company) return;
    root.setProperty('--brand', company.theme.brand);
    root.setProperty('--brand-wash', company.theme.brandWash);
    root.setProperty('--focus', company.theme.brand);
    return () => {
      root.removeProperty('--brand');
      root.removeProperty('--brand-wash');
      root.removeProperty('--focus');
    };
  }, [company]);
}
