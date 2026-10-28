import { NextResponse } from 'next/server';
import { writeNarrative } from '@/lib/narrative';
import { aiEnabled } from '@/lib/ai';
import { rateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req) {
  if (!aiEnabled()) return NextResponse.json({ error: 'The narrative writer is switched off on this site right now.' }, { status: 503 });
  if (!rateLimit(req, { key: 'narrative', limit: 6, windowMs: 60_000 }) || !rateLimit(req, { key: 'narrative-h', limit: 40, windowMs: 3_600_000 })) {
    return NextResponse.json({ error: 'That\'s a lot of narratives. Give it a minute.' }, { status: 429 });
  }
  let body = {};
  try { body = await req.json(); } catch {}
  const result = await writeNarrative({
    themeName: typeof body.theme === 'string' ? body.theme : '',
    angle: typeof body.angle === 'string' ? body.angle : '',
  });
  return NextResponse.json(result, { status: result.error ? 502 : 200 });
}
