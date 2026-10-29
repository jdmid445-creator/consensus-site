import { NextResponse } from 'next/server';
import { getMeta } from '@/lib/meta';
import { getCandles } from '@/lib/gecko';

// GET /api/spark?a=<mint>: the last 24 hours of 15-minute closes for one of today's runners,
// for the lead card when a new coin takes the lead between page refreshes.
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const a = new URL(req.url).searchParams.get('a') || '';
  const meta = await getMeta();
  const r = meta.runners.find((x) => x.address === a);
  if (!r?.pairAddress) return NextResponse.json({ points: [] }, { status: 404 });
  const points = await getCandles(r.pairAddress, { timeframe: 'minute', aggregate: 15, limit: 96, revalidate: 300 });
  return NextResponse.json({ points }, { headers: { 'cache-control': 'public, s-maxage=120' } });
}
