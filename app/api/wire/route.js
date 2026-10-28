import { NextResponse } from 'next/server';
import { getWire } from '@/lib/wire';

// GET /api/wire[?a=<mint>]: the latest wire events (for one coin if given).
export const dynamic = 'force-dynamic';
const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(req) {
  const a = new URL(req.url).searchParams.get('a') || '';
  const all = await getWire(200).catch(() => []);
  const list = MINT.test(a) ? all.filter((e) => e.address === a).slice(0, 8) : all.slice(0, 14);
  return NextResponse.json(list, { headers: { 'cache-control': 'public, s-maxage=20' } });
}
