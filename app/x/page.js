import { notFound } from 'next/navigation';
import XTop from '@/components/XTop';
import { getMeta } from '@/lib/meta';
import { getXTop, xTopEnabled } from '@/lib/xtop';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const metadata = { title: 'Top on X' };

export default async function XPage() {
  if (!xTopEnabled()) notFound();
  const meta = await getMeta();
  const data = await getXTop(meta.runners).catch(() => null);
  return (
    <div className="board-app">
      <header className="page-head">
        <h1>Top on X today</h1>
        <p className="muted">The 25 biggest posts of the day about meme coins and memes, ranked by likes, reposts and quotes. It checks X for new ones every 15 minutes.</p>
      </header>
      <XTop initial={data || { lists: { all: [], coin: [], meme: [] }, named: [], every: 90 }} />
    </div>
  );
}
