import { NextResponse } from 'next/server';
import { resolveTokens } from '@/lib/dexscreener';

// Live prices for up to 30 tokens: GET /api/live?a=<mint>,<mint>
// Shared by all visitors through a 10-second cache, so DexScreener sees at most a few calls a minute.
export const dynamic = 'force-dynamic';

const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(req) {
  const list = (new URL(req.url).searchParams.get('a') || '').split(',').filter((a) => MINT.test(a)).slice(0, 30);
  if (!list.length) return NextResponse.json({});
  const pairs = await resolveTokens(list, { revalidate: 10 });
  const out = {};
  for (const [addr, p] of pairs) {
    out[addr] = {
      priceUsd: Number(p.priceUsd) || null,
      marketCap: p.marketCap || p.fdv || null,
      change: { m5: p.priceChange?.m5 ?? null, h1: p.priceChange?.h1 ?? null, h6: p.priceChange?.h6 ?? null, h24: p.priceChange?.h24 ?? null },
    };
  }
  return NextResponse.json(out, { headers: { 'cache-control': 'public, s-maxage=10, stale-while-revalidate=20' } });
}
