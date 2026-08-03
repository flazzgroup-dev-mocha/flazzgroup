import "server-only";

import { clientIp } from "@/lib/client-ip";

/**
 * Fixed-window rate limiter held in process memory.
 *
 * Good enough for a single-instance deployment, which is what this project
 * targets. If it is ever scaled to more than one container, move the counter
 * to Redis or Postgres — the call sites do not change, only this file.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Drops expired buckets so the map cannot grow without bound. */
function sweep(now: number) {
  if (buckets.size < 500) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
};

export function rateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  return { ok: true, remaining: limit - existing.count, retryAfter: 0 };
}

/** Clears a bucket — call after a successful login so one user is not punished. */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/**
 * The bucket a request counts against.
 *
 * Delegates identification to `clientIp`, which only believes a forwarding
 * header that infrastructure wrote — see the reasoning in lib/client-ip.ts.
 * This function used to read `X-Forwarded-For[0]`, the one value a client can
 * choose, so rotating it gave every request a private bucket and the limiter
 * counted to one forever.
 *
 * When nothing identifies the caller, every such request shares the single
 * `anonymous` bucket. That is deliberately strict: an unidentifiable flood is
 * throttled as one caller rather than waved through as many. It also means a
 * misconfigured deployment fails loudly — legitimate users start seeing 429s —
 * instead of failing silently open, which is how the original bug survived.
 */
export function clientKey(request: Request, scope: string) {
  return `${scope}:${clientIp(request) ?? "anonymous"}`;
}
