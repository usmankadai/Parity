import type { HttpHandler } from 'msw';

/**
 * The default MSW handlers, shared by the browser worker and the Node server.
 * Endpoints are added with the features that use them (countries and benefits
 * in milestone 2, ask in milestone 4).
 */
export const handlers: HttpHandler[] = [];
