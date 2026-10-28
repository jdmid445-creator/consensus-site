import { NextResponse } from 'next/server';
import { resolveTokens } from '@/lib/dexscreener';

// Live numbers for up to 30 tokens: GET /api/live?a=<mint>,<mint>
// Used only when the browser can't reach DexScreener directly. No server-side cache;
// the CDN holds an answer for 2 seconds so a crowd on the same coin shares one call.
export const dynamic = 'force-dynamic';

const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(req) {
  const list = (new URL(req.url).searchParams.get('a') || '').split(',').filter((a) => MINT.test(a)).slice(0, 30);
  if (!list.length) return NextResponse.json({});
  const pairs = await resolveTokens(list, { revalidate: 0 });
  const out = {};
  for (const [addr, p] of pairs) {
    out[addr] = {
      priceUsd: Number(p.priceUsd) || null,
      marketCap: p.marketCap || p.fdv || null,
      liquidity: p.liquidity?.usd ?? null,
      volume: { m5: p.volume?.m5 ?? null, h1: p.volume?.h1 ?? null, h6: p.volume?.h6 ?? null, h24: p.volume?.h24 ?? null },
      change: { m5: p.priceChange?.m5 ?? null, h1: p.priceChange?.h1 ?? null, h6: p.priceChange?.h6 ?? null, h24: p.priceChange?.h24 ?? null },
      buys24h: p.txns?.h24?.buys ?? null,
      sells24h: p.txns?.h24?.sells ?? null,
      at: Date.now(),
    };
  }
  return NextResponse.json(out, { headers: { 'cache-control': 'public, s-maxage=2' } });
}
