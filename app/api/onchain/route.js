import { NextResponse } from 'next/server';
import { resolveTokens } from '@/lib/dexscreener';
import { getOnchain } from '@/lib/onchain';
import { rateLimit } from '@/lib/ratelimit';

// GET /api/onchain?a=<mint>: holders, whales, dev and bundle stats for one coin (refreshed every ~15s).
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(req) {
  const a = new URL(req.url).searchParams.get('a') || '';
  if (!MINT.test(a)) return NextResponse.json({ error: 'That isn’t a Solana token address.' }, { status: 400 });
  if (!process.env.HELIUS_API_KEY) return NextResponse.json({ error: 'Holder stats are switched off on this site right now.' }, { status: 503 });
  if (!rateLimit(req, { key: 'onchain', limit: 12, windowMs: 60_000 })) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });

  // Straight from DexScreener (cached 2 minutes): no need to build the whole board for one coin.
  let r;
  {
    const p = (await resolveTokens([a], { revalidate: 120 })).get(a);
    if (!p) return NextResponse.json({ error: 'Couldn’t find this coin on DexScreener.' }, { status: 404 });
    r = { pairAddress: p.pairAddress, liquidityBase: Number(p.liquidity?.base) || 0 };
  }
  const data = await getOnchain(a, { pairAddress: r.pairAddress, poolTokens: r.liquidityBase });
  if (!data) return NextResponse.json({ error: 'Holder stats couldn’t be read just now.' }, { status: 502 });
  return NextResponse.json(data, { headers: { 'cache-control': 'public, s-maxage=10' } });
}
