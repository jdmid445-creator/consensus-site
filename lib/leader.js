// Today's #1 by the same rule the leader card uses in the browser: the biggest 24h gain among
// runners with real trading behind them, on live DexScreener numbers. Doing it on the server
// too means the page loads on the right coin instead of switching a few seconds in.
export function pickLeader(runners) {
  const solid = runners.filter((r) => typeof r.change?.h24 === 'number' && r.volume24h >= 50_000 && r.liquidity >= 15_000);
  return [...(solid.length ? solid : runners)].sort((a, b) => (b.change?.h24 ?? -1e9) - (a.change?.h24 ?? -1e9))[0];
}

export async function liveField(runners, { revalidate = 15 } = {}) {
  const by = new Map();
  const base = process.env.DEXSCREENER_BASE || 'https://api.dexscreener.com';
  await Promise.all(
    Array.from({ length: Math.ceil(runners.length / 30) }, (_, i) => runners.slice(i * 30, i * 30 + 30)).map(async (chunk) => {
      try {
        const res = await fetch(`${base}/tokens/v1/solana/${chunk.map((x) => x.address).join(',')}`, { next: { revalidate }, signal: AbortSignal.timeout(4000) });
        for (const p of res.ok ? await res.json() : []) {
          const k = p.baseToken?.address;
          if (k && (!by.has(k) || (p.liquidity?.usd || 0) > (by.get(k).liquidity?.usd || 0))) by.set(k, p);
        }
      } catch {}
    }),
  );
  return runners.map((x) => {
    const L = by.get(x.address);
    return L ? { ...x, change: { ...x.change, h1: L.priceChange?.h1 ?? x.change?.h1, h24: L.priceChange?.h24 ?? x.change?.h24 }, volume24h: L.volume?.h24 ?? x.volume24h, liquidity: L.liquidity?.usd ?? x.liquidity, marketCap: L.marketCap ?? x.marketCap } : x;
  });
}
