// Simple per-IP rate limit. It lives in each server instance's memory, which is
// enough to stop casual spam. For heavy traffic, swap in a shared store
// (for example Upstash Redis) so limits hold across instances.
const buckets = new Map();

export function rateLimit(req, { key, limit, windowMs }) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  const id = `${key}:${ip}`;
  const now = Date.now();
  const hits = (buckets.get(id) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(id, hits);
    return false;
  }
  hits.push(now);
  buckets.set(id, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return true;
}
