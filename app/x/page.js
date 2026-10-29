import { notFound } from 'next/navigation';
import XTracker from '@/components/XTracker';
import { getMeta } from '@/lib/meta';
import { xFeedEnabled } from '@/lib/xfeed';
import { getXLive } from '@/lib/xlive';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
export const metadata = { title: 'X tracker' };

export default async function XPage() {
  if (!xFeedEnabled()) notFound();
  const meta = await getMeta();
  const data = await getXLive(meta.runners).catch(() => null);
  return (
    <div className="board-app">
      <header className="page-head">
        <h1>X tracker</h1>
        <p className="muted">Live posts about today&apos;s runners and from the big crypto accounts, a few seconds after they go up.</p>
      </header>
      <XTracker initial={data || { posts: [], talked: [], loud: [], poll: 5 }} />
    </div>
  );
}
