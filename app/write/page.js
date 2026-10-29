import NarrativeWriter from '@/components/NarrativeWriter';
import Widget from '@/components/Widget';
import { getMeta } from '@/lib/meta';

export const revalidate = 30;
export const maxDuration = 60;
export const metadata = { title: 'Write a narrative' };

export default async function Write() {
  const meta = await getMeta();
  const named = meta.stats.themes.filter((t) => t.id !== 'other');
  return (
    <div className="dash dash-one">
      <header className="page-head">
        <h1>Write a narrative</h1>
        <p className="muted">An original coin idea built on what&apos;s running right now. Each one is new and never reuses a live ticker.</p>
      </header>
      <Widget className="wg-writer">
        <NarrativeWriter enabled={meta.aiEnabled} narratives={(meta.summary?.themes || named).map((t) => t.name).slice(0, 6)} />
      </Widget>
    </div>
  );
}
