import { getMeta } from '@/lib/meta';
import { getXTop } from '@/lib/xtop';
import { getCelebPosts } from '@/lib/xceleb';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Today's top 25, polled by the X page every few seconds.
export async function GET() {
  const meta = await getMeta();
  const [data, celebs] = await Promise.all([getXTop(meta.runners), getCelebPosts([...meta.runners, ...(meta.alsoRunning || [])]).catch(() => null)]);
  if (!data) return Response.json({ error: 'off' }, { status: 404 });
  return Response.json({ ...data, celebs },  { headers: { 'cache-control': 'no-store' } });
}
