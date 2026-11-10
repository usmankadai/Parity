import harbourside from './harbourside.json';
import northwind from './northwind.json';

/**
 * Fictional companies, one file each. The mock API serves them as they are,
 * and the client validates them (src/api/validateCompany.ts).
 */
export const companies: unknown[] = [northwind, harbourside];
