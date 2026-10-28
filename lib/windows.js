import { getPoolWindows, getCandles } from './gecko';
import { hasRedis, redis } from './pool';

// Adds per-window price change and volume to each runner:
//   change: { m30, h1, h6, h12, h24 }, volume: { m30, h1, h6, h24 }
// 30m/1h/6h/24h come from GeckoTerminal pool data (DexScreener's h1/h6/h24 fill gaps).
// 12h isn't offered by either source, so it's worked out from hourly candles: last close
// vs the close 12 hours earlier. Those are cached 30 minutes per pool and filled in a few
// at a time to stay inside rate limits, so a brand-new runner may show 12h a little later.
const H12_KEY = 'consensus:h12';
const H12_TTL = 30 * 60 * 1000;
const H12_PER_REFRESH = 6;
const memory = new Map();

// GeckoTerminal window data for the whole runner set, refreshed at most every 15 minutes
// (that's what keeps the CoinGecko demo key under its monthly cap). Runners that joined
// since the last refresh use DexScreener's 1h/6h/24h until the next one.
const WIN_KEY = 'consensus:gtwin';
const WIN_TTL = 15 * 60 * 1000;
let winMemory = null;

async function windowsFor(pools) {
  let cached = winMemory;
  if (hasRedis()) {
    try {
      const [res] = await redis([['GET', WIN_KEY]]);
      if (res?.result) cached = JSON.parse(res.result);
    } catch (e) {
      console.warn('[windows] cache read failed:', e.message);
    }
  }
  if (cached && Date.now() - cached.at < WIN_TTL) return new Map(Object.entries(cached.data));
  const fresh = await getPoolWindows([...pools].sort());
  if (fresh.size === 0) return new Map(Object.entries(cached?.data || {}));
  const entry = { at: Date.now(), data: Object.fromEntries(fresh) };
  winMemory = entry;
  if (hasRedis()) {
    try { await redis([['SET', WIN_KEY, JSON.stringify(entry), 'EX', 3600]]); } catch {}
  }
  return fresh;
}

async function loadH12(pools) {
  const now = Date.now();
  const out = new Map();
  if (hasRedis() && pools.length) {
    try {
      const [res] = await redis([['HMGET', H12_KEY, ...pools]]);
      (res?.result || []).forEach((v, i) => {
        if (!v) return;
        const d = JSON.parse(v);
        if (now - d.at < H12_TTL) out.set(pools[i], d.v);
      });
      return out;
    } catch (e) {
      console.warn('[h12] cache read failed:', e.message);
    }
  }
  for (const p of pools) {
    const d = memory.get(p);
    if (d && now - d.at < H12_TTL) out.set(p, d.v);
  }
  return out;
}

async function saveH12(entries) {
  const at = Date.now();
  for (const [p, v] of entries) memory.set(p, { v, at });
  if (hasRedis() && entries.length) {
    try {
      const cmd = ['HSET', H12_KEY];
      for (const [p, v] of entries) cmd.push(p, JSON.stringify({ v, at }));
      await redis([cmd, ['EXPIRE', H12_KEY, 6 * 3600]]);
    } catch (e) {
      console.warn('[h12] cache write failed:', e.message);
    }
  }
}

async function h12From(pool, ageHours) {
  const candles = await getCandles(pool, { timeframe: 'hour', aggregate: 1, limit: 14, revalidate: 600 });
  if (candles.length < 2) return null;
  const last = candles[candles.length - 1];
  // Younger than 12h: change since its first candle (as good as "since launch").
  const target = last.t - 12 * 3600 * 1000;
  const from = ageHours != null && ageHours < 12 ? candles[0] : candles.find((k) => k.t >= target) || candles[0];
  if (!from || from === last) return null;
  return ((last.c - from.c) / from.c) * 100;
}

export async function addWindows(runners) {
  const pools = runners.map((r) => r.pairAddress).filter(Boolean);
  const [gt, h12] = await Promise.all([windowsFor(pools), loadH12(pools)]);

  const missing = runners.filter((r) => r.pairAddress && !h12.has(r.pairAddress)).slice(0, H12_PER_REFRESH);
  const fresh = [];
  await Promise.all(
    missing.map(async (r) => {
      const v = await h12From(r.pairAddress, r.ageHours);
      if (v != null) fresh.push([r.pairAddress, v]);
    }),
  );
  await saveH12(fresh);
  for (const [p, v] of fresh) h12.set(p, v);

  return runners.map((r) => {
    const g = gt.get(r.pairAddress);
    return {
      ...r,
      change: {
        m5: r.change.m5 ?? null,
        m30: g?.change.m30 ?? null,
        h1: g?.change.h1 ?? r.change.h1,
        h6: g?.change.h6 ?? r.change.h6,
        h12: h12.get(r.pairAddress) ?? null,
        h24: g?.change.h24 ?? r.change.h24,
      },
      volume: {
        m30: g?.volume.m30 ?? null,
        h1: g?.volume.h1 ?? r.volume.h1,
        h6: g?.volume.h6 ?? r.volume.h6,
        h24: g?.volume.h24 ?? r.volume24h,
      },
    };
  });
}
