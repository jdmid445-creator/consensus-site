import { NextResponse } from 'next/server';
import { getMeta } from '@/lib/meta';

// Public, read-only JSON of everything on the front page. Cached for 3 minutes.
export const revalidate = 180;

export async function GET() {
  const meta = await getMeta();
  return NextResponse.json(meta, {
    headers: { 'cache-control': 'public, s-maxage=180, stale-while-revalidate=600', 'access-control-allow-origin': '*' },
  });
}
