type RateRecord = { count: number; resetAt: number };

const store = new Map<string, RateRecord>();

export function isRateLimited(key: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const rec = store.get(key);
  if (!rec || rec.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (rec.count >= limit) return true;
  rec.count += 1;
  store.set(key, rec);
  return false;
}

export function getRateInfo(key: string) {
  const rec = store.get(key);
  if (!rec) return { count: 0, resetAt: 0 };
  return rec;
}

export function resetRate(key: string) {
  store.delete(key);
}
