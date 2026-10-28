import Link from 'next/link';
import CoinImg from './CoinImg';

const LABEL = { joined: 'New runner', milestone: 'Milestone', lead: 'New leader', surge: 'Surge', drop: 'Drop', climb: 'Climbing' };
const time = (at) => new Date(at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });

// The wire: what just happened among the runners, newest first.
export default function Wire({ events }) {
  if (!events.length) {
    return <p className="wire-empty">The wire fills in as coins join the runners, cross milestones and make big moves. The first events show up within a few minutes of the site going live.</p>;
  }
  return (
    <ol className="wire">
      {events.map((e) => (
        <li key={e.id} className={`wire-${e.type}`}>
          <time dateTime={new Date(e.at).toISOString()}>{time(e.at)}</time>
          <Link href={`/coin/${e.address}`} className="wire-item">
            <CoinImg src={e.image} name={e.name} symbol={e.symbol} size={26} />
            <span>
              <span className="wire-kind">{LABEL[e.type] || 'Update'}</span>
              <span className="wire-text"><b>{e.name}</b> {e.text}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
