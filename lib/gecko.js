import { getJson, chunk } from './http';

// GeckoTerminal. Two routes, to stay inside the free limits:
//  - keyless (shared ~5 calls/min, no monthly cap): finding candidates, hourly candles, the chart
//  - CoinGecko demo key (30 calls/min but 10,000 calls/MONTH): only the per-window numbers,
//    refreshed every 15 minutes (~2 calls each time, ~6K calls/month)
// Every call fails soft, and found candidates are remembered in Redis, so a rate-limited
// call just means fewer new candidates this round.
function base(keyed = false) {
  const key = process.env.COINGECKO_API_KEY;
  if (keyed && key) return { url: 'https://api.coingecko.com/api/v3/onchain', headers: { 'x-cg-demo-api-key': key } };
  return { url: process.env.GECKOTERMINAL_BASE || 'https://api.geckoterminal.com/api/v2', headers: {} };
}

export async function getGeckoCandidates() {
  const { url, headers } = base();
  // Staggered cache times so the calls don't all fire in the same minute.
  const paths = [
    ['/networks/solana/trending_pools?duration=24h&page=1', 300],
    ['/networks/solana/trending_pools?duration=1h&page=1', 360],
    ['/networks/solana/trending_pools?duration=6h&page=1', 420],
    ['/networks/solana/pools?sort=h24_volume_usd_desc&page=1', 480],
    ['/networks/solana/dexes/pumpswap/pools?sort=h24_volume_usd_desc&page=1', 540],
    ['/networks/solana/trending_pools?duration=24h&page=2', 600],
  ];
  const results = await Promise.all(paths.map(([p, revalidate]) => getJson(url + p, { headers, revalidate })));
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
  const { url, headers } = base(true);
  const out = new Map();
  const results = await Promise.all(
    chunk([...new Set(pools)], 30).map((group) => getJson(`${url}/networks/solana/pools/multi/${group.join(',')}`, { headers, revalidate: 900 })),
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

// Token logos from GeckoTerminal for up to 30 tokens (keyless, cached a day). Used only for
// coins that have no logo on DexScreener or in their launch metadata.
export async function getTokenImages(addresses) {
  const out = new Map();
  if (!addresses.length) return out;
  const { url, headers } = base();
  const r = await getJson(`${url}/networks/solana/tokens/multi/${addresses.slice(0, 30).join(',')}`, { headers, revalidate: 86400 });
  for (const t of r?.data || []) {
    const a = t?.attributes;
    const img = a?.image_url || '';
    if (a?.address && /^https:\/\//.test(img) && !/missing/i.test(img)) out.set(a.address, img);
  }
  return out;
}
