/**
 * Security headers for every response. The same list is used by
 * `rsbuild preview` (so Playwright tests run under them) and by vercel.json
 * (production). A unit test fails if the two ever differ.
 */

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  // No inline scripts: the build emits only external script files.
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  // Every API call (and the mocked ones) goes to our own origin.
  "connect-src 'self'",
  // The public demo runs on MSW's service worker (public/mockServiceWorker.js).
  // Without this, the demo works locally and breaks only in production.
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
];
