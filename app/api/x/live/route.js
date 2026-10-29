import { getMeta } from '@/lib/meta';
import { getXLive } from '@/lib/xlive';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

// The live feed the X tracker polls every few seconds.
export async function GET() {
  const meta = await getMeta();
  const data = await getXLive(meta.runners);
  if (!data) return Response.json({ error: 'off' }, { status: 404 });
  return Response.json(data, { headers: { 'cache-control': 'no-store' } });
}
