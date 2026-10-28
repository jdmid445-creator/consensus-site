// A memory of tokens that have qualified (or come close) in the last week.
// DexScreener's "latest" lists only show the newest few dozen tokens, so a coin that ran
// two days ago would drop out of view. Remembering the ones that mattered fixes that,
// and keeps the lookup small (at most MAX tokens).
// Storage: Upstash Redis (Vercel → Storage) if configured, otherwise this server's memory.
const KEY = 'consensus:pool';
const MAX = 450;
let memory = [];

const redisUrl = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const hasRedis = () => Boolean(redisUrl() && redisToken());

async function redis(commands) {
  const res = await fetch(`${redisUrl()}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${redisToken()}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return res.json();
}

export async function loadPool() {
  if (hasRedis()) {
    try {
      const [out] = await redis([['GET', KEY]]);
      const list = out?.result ? JSON.parse(out.result) : [];
      if (Array.isArray(list)) return list;
    } catch (e) {
      console.warn('[pool] redis read failed, using memory:', e.message);
    }
  }
  return memory;
}

// `ranked` should be sorted best first; the tail is dropped past MAX.
export async function savePool(ranked) {
  const list = [...new Set(ranked)].slice(0, MAX);
  memory = list;
  if (hasRedis()) {
    try {
      await redis([['SET', KEY, JSON.stringify(list), 'EX', 8 * 24 * 3600]]);
    } catch (e) {
      console.warn('[pool] redis write failed:', e.message);
    }
  }
}
