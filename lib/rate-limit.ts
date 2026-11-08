// In-memory per-IP/per-user rate limiter for Route Handlers.
// Best-effort on serverless (state is per-instance); the 5 orders / 5 min rule
// is also a reasonable abuse brake. Upstash Redis would make it global.
type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX = 5;
export function rateLimit(key: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const e = buckets.get(key);
  if (!e || now >= e.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfterSec: 0 };
  }
  if (e.count >= MAX) return { ok: false, retryAfterSec: Math.ceil((e.resetAt - now) / 1000) };
  e.count += 1;
  return { ok: true, retryAfterSec: 0 };
}
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown').slice(0, 64);
}
