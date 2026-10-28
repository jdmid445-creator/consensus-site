import { NextResponse } from 'next/server';
import { getMeta } from '@/lib/meta';
import { getBrief } from '@/lib/brief';
import { aiEnabled, aiLastError } from '@/lib/ai';
import { rateLimit } from '@/lib/ratelimit';

// GET /api/brief?a=<mint>: the story for one of today's runners (cached 2h per coin).
// Only current runners get a story, so this can't be used to run the AI on any address.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req) {
  const a = new URL(req.url).searchParams.get('a') || '';
  if (!aiEnabled()) return NextResponse.json({ error: 'Stories are switched off on this site right now.' }, { status: 503 });
  const meta = await getMeta();
  const r = meta.runners.find((x) => x.address === a);
  if (!r) return NextResponse.json({ error: 'Stories are written for today’s runners only.' }, { status: 404 });
  if (!rateLimit(req, { key: 'brief', limit: 20, windowMs: 60_000 })) return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
  const narratives = (meta.summary?.themes || []).filter((t) => t.addresses.includes(a));
  const brief = await getBrief(r, { narratives });
  if (!brief) return NextResponse.json({ error: 'The story couldn’t be written just now.', detail: aiLastError() }, { status: 502 });
  return NextResponse.json(brief, { headers: { 'cache-control': 'public, s-maxage=600, stale-while-revalidate=3600' } });
}
