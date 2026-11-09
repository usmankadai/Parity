import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from '../../config/securityHeaders';
import vercel from '../../vercel.json';

describe('security headers', () => {
  it('are the same in vercel.json as in config/securityHeaders.ts', () => {
    const allRoutes = vercel.headers.find((rule) => rule.source === '/(.*)');
    expect(allRoutes?.headers).toEqual(SECURITY_HEADERS);
  });

  it('allow the MSW service worker and our own API, and nothing inline', () => {
    const csp = SECURITY_HEADERS.find((header) => header.key === 'Content-Security-Policy')?.value;
    const directives = new Map(
      (csp ?? '').split('; ').map((directive) => {
        const [name = '', ...values] = directive.split(' ');
        return [name, values];
      }),
    );

    expect(directives.get('worker-src')).toEqual(["'self'"]);
    expect(directives.get('connect-src')).toEqual(["'self'"]);
    expect(directives.get('script-src')).toEqual(["'self'"]);
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
  });
});
