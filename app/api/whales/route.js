import { NextResponse } from 'next/server';
import { resolveTokens } from '@/lib/dexscreener';
import { getOnchain } from '@/lib/onchain';
import { getPnl, pnlEnabled, pnlLastError, getTopTraders, getTopTradersIn } from '@/lib/pnl';
import { rateLimit } from '@/lib/ratelimit';

// GET /api/whales?a=<mint>: the biggest wallets in a coin (pool excluded), what they hold,
// whether they're the dev / a bundle / an early buyer, and (with a Solana Tracker key) their
// PnL on this coin and across everything they've traded.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SHOW = 20;

export async function GET(req) {
  const a = new URL(req.url).searchParams.get('a') || '';
  if (!MINT.test(a)) return NextResponse.json({ error: 'That isn’t a Solana token address.' }, { status: 400 });
  if (!process.env.HELIUS_API_KEY) return NextResponse.json({ error: 'Wallet stats are switched off on this site right now.' }, { status: 503 });
  if (!rateLimit(req, { key: 'whales', limit: 30, windowMs: 60_000 })) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });

  // Straight from DexScreener (cached 2 minutes): no need to build the whole board for one coin.
  let r;
  {
    const p = (await resolveTokens([a], { revalidate: 120 })).get(a);
    if (!p) return NextResponse.json({ error: 'Couldn’t find this coin on DexScreener.' }, { status: 404 });
    r = { pairAddress: p.pairAddress, liquidityBase: Number(p.liquidity?.base) || 0 };
  }
  const on = await getOnchain(a, { pairAddress: r.pairAddress, poolTokens: r.liquidityBase });
  if (!on) return NextResponse.json({ error: 'Wallets couldn’t be read just now.' }, { status: 502 });
  const list = (on.wallets || []).slice(0, SHOW);
  const lite = new URL(req.url).searchParams.get('lite') === '1';
  const cap = (ms, p) => Promise.race([p, new Promise((res) => setTimeout(() => res(null), ms))]);
  const [pnl, top, smart] = lite ? [null, [], null] : await Promise.all([
    cap(8000, getPnl(a, list.map((w) => w.owner))),
    cap(8000, getTopTraders().catch(() => [])).then((x) => x || []),
    cap(8000, getTopTradersIn(a, on.supply).catch(() => null)),
  ]);
  const topRank = new Map(top.map((t) => [t.wallet, t.rank]));
  const wallets = list.map((w) => ({ ...w, ...(pnl?.[w.owner] || {}), topRank: topRank.get(w.owner) || null }));
  return NextResponse.json(
    { wallets, smart, topCount: top.length, excluded: on.excluded || 0, supply: on.supply, whales: on.whales, pnl: pnlEnabled() ? (lite ? 'loading' : pnl ? 'ok' : 'error') : 'off', pnlError: pnl ? '' : pnlLastError(), at: Date.now() },
    { headers: { 'cache-control': 'public, s-maxage=15' } },
  );
}
