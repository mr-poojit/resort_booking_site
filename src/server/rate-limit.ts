type RateBucket = { count: number; resetAt: number };

const buckets = new Map<string, RateBucket>();

export function allowRequest(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
): boolean {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const address = request.headers.get("x-real-ip") ?? forwarded ?? "local";
  const key = `${scope}:${address}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
