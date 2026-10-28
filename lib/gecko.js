import { getJson, chunk } from './http';

// GeckoTerminal (via a CoinGecko demo key when COINGECKO_API_KEY is set, ~30 calls/min;
// keyless otherwise, ~5 calls/min). Used for:
//  - finding candidate tokens (trending + top-volume Solana pools)
//  - 30m / 1h / 6h / 24h price change and volume per runner's pool
//  - hourly candles, for 12h change and the top runner's chart
function base() {
  const key = process.env.COINGECKO_API_KEY;
  if (key) return { url: 'https://api.coingecko.com/api/v3/onchain', headers: { 'x-cg-demo-api-key': key } };
  return { url: process.env.GECKOTERMINAL_BASE || 'https://api.geckoterminal.com/api/v2', headers: {} };
}

export async function getGeckoCandidates() {
  const { url, headers } = base();
  const paths = [
    '/networks/solana/trending_pools?duration=24h&page=1',
    '/networks/solana/trending_pools?duration=6h&page=1',
    '/networks/solana/pools?sort=h24_volume_usd_desc&page=1',
  ];
  const results = await Promise.all(paths.map((p) => getJson(url + p, { headers, revalidate: 300 })));
  const out = new Set();
  for (const r of results) {
    for (const pool of r?.data || []) {
      const id = pool?.relationships?.base_token?.data?.id || '';
      if (id.startsWith('solana_')) out.add(id.slice('solana_'.length));
    }
  }
  return out;
}

const num = (x) => (x == null || x === '' || !isFinite(Number(x)) ? null : Number(x));

// Price change and volume by window for up to 30 pools per call.
// Returns Map(poolAddress -> { change: {m30,h1,h6,h24}, volume: {m30,h1,h6,h24} })
export async function getPoolWindows(pools) {
  const { url, headers } = base();
  const out = new Map();
  const results = await Promise.all(
    chunk([...new Set(pools)], 30).map((group) => getJson(`${url}/networks/solana/pools/multi/${group.join(',')}`, { headers, revalidate: 120 })),
  );
  for (const r of results) {
    for (const pool of r?.data || []) {
      const a = pool?.attributes;
      if (!a?.address) continue;
      const pc = a.price_change_percentage || {};
      const v = a.volume_usd || {};
      out.set(a.address, {
        change: { m30: num(pc.m30), h1: num(pc.h1), h6: num(pc.h6), h24: num(pc.h24) },
        volume: { m30: num(v.m30), h1: num(v.h1), h6: num(v.h6), h24: num(v.h24) },
      });
    }
  }
  return out;
}

// Candles for one pool, oldest first: [{ t, c, v }]
export async function getCandles(pool, { timeframe = 'hour', aggregate = 1, limit = 24, revalidate = 300 } = {}) {
  const { url, headers } = base();
  const r = await getJson(
    `${url}/networks/solana/pools/${pool}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}&currency=usd`,
    { headers, revalidate },
  );
  const list = r?.data?.attributes?.ohlcv_list;
  if (!Array.isArray(list)) return [];
  return list
    .map(([t, , , , c, v]) => ({ t: t * 1000, c: Number(c), v: Number(v) }))
    .filter((k) => isFinite(k.c) && k.c > 0)
    .sort((a, b) => a.t - b.t);
}
