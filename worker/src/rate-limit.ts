type Bucket = {
  startedAt: number;
  count: number;
  expiresAt: number;
};

// Per-isolate defense in depth. Cloudflare edge rate limiting should also be
// enabled for production because Workers may serve traffic from many isolates.
const buckets = new Map<string, Bucket>();
export const DEFAULT_MAX_BUCKETS = 20_000;
let maxBuckets = DEFAULT_MAX_BUCKETS;
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 30_000;

export function resetRateLimits() {
  buckets.clear();
  maxBuckets = DEFAULT_MAX_BUCKETS;
  lastCleanup = Date.now();
}

export function setMaxBucketsForTest(capacity: number) {
  maxBuckets = capacity > 0 ? capacity : DEFAULT_MAX_BUCKETS;
}

export function getBucketCount(): number {
  return buckets.size;
}

export function cleanupExpiredBuckets(now = Date.now()): number {
  let cleaned = 0;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.expiresAt) {
      buckets.delete(key);
      cleaned++;
    }
  }
  lastCleanup = now;
  return cleaned;
}

export function isRateLimited(
  request: Request,
  scope: string,
  limit = 60,
  windowMs = 60_000,
  discriminator = "",
): boolean {
  const now = Date.now();
  const safeWindow = windowMs > 0 ? windowMs : 60_000;
  const client =
    (typeof request?.headers?.get === "function"
      ? request.headers.get("cf-connecting-ip")
      : null) || "local";
  const key = `${scope}:${client}:${discriminator}`;

  // Periodic passive maintenance of expired buckets
  if (now - lastCleanup >= CLEANUP_INTERVAL_MS && buckets.size > 0) {
    cleanupExpiredBuckets(now);
  }

  const existing = buckets.get(key);

  if (!existing || now >= existing.expiresAt || now < existing.startedAt) {
    // If at or over capacity, first evict expired entries.
    if (buckets.size >= maxBuckets) {
      cleanupExpiredBuckets(now);
    }

    // If still at or over capacity, evict the oldest (LRU/FIFO) bucket to ensure
    // memory remains bounded and new callers are never globally denied service.
    while (buckets.size >= maxBuckets) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey === undefined) break;
      buckets.delete(oldestKey);
    }

    buckets.set(key, {
      startedAt: now,
      count: 1,
      expiresAt: now + safeWindow,
    });

    return 1 > limit;
  }

  // Update existing bucket
  existing.count++;

  // Refresh LRU position in Map (re-insert moves to the end of insertion order)
  buckets.delete(key);
  buckets.set(key, existing);

  return existing.count > limit;
}
