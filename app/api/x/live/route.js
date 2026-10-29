import { getMeta } from '@/lib/meta';
import { getXTop } from '@/lib/xtop';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Today's top 25, polled by the X page every few seconds.
export async function GET() {
  const meta = await getMeta();
  const data = await getXTop(meta.runners);
  if (!data) return Response.json({ error: 'off' }, { status: 404 });
  return Response.json(data, { headers: { 'cache-control': 'no-store' } });
}
