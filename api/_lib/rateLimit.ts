/**
 * A simple per-IP limit: at most `limit` requests in a sliding `windowMs`.
 *
 * It lives in memory, so on serverless hosting each running instance counts
 * separately and a cold start resets it. It is a demo guard against casual
 * abuse, not real protection; a shared store (for example Redis) would be
 * needed for that. The README says so.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();

  return {
    /** Records a request and returns whether it is allowed, and when to retry if not. */
    check(
      key: string,
      now: number,
    ): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
      const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        const oldest = recent[0] ?? now;
        return { allowed: false, retryAfterSeconds: Math.ceil((oldest + windowMs - now) / 1000) };
      }
      recent.push(now);
      hits.set(key, recent);
      return { allowed: true };
    },
  };
}

/** The caller's IP, from the first entry of x-forwarded-for (set by Vercel). */
export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}
