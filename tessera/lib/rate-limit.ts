interface RateLimitEntry {
  count: number;
  resetsAt: number;
}

const entries = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 60_000,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  const current = entries.get(key);
  if (!current || current.resetsAt <= now) {
    entries.set(key, { count: 1, resetsAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetsAt - now) / 1000)),
    };
  }
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clientKey(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}
