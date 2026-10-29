import AutoRefresh from '@/components/AutoRefresh';
import RunnersTable from '@/components/RunnersTable';
import Widget from '@/components/Widget';
import { getMeta } from '@/lib/meta';

export const revalidate = 180;
export const maxDuration = 60;
export const metadata = { title: 'All coins' };

export default async function Coins() {
  const meta = await getMeta();
  return (
    <div className="dash dash-one">
      <AutoRefresh ms={60000} />
      <header className="page-head">
        <h1>All {meta.stats.count} runners</h1>
        <p className="muted">The biggest Solana memecoins launched in the last {meta.windowHours} hours, by market cap. Numbers update live.</p>
      </header>
      <Widget className="wg-table">
        <RunnersTable runners={meta.runners} themes={meta.stats.themes} />
      </Widget>
    </div>
  );
}
