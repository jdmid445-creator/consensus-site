import Link from 'next/link';
import CoinImg from './CoinImg';

const LABEL = { joined: 'New runner', milestone: 'Milestone', lead: 'New leader', surge: 'Surge', drop: 'Drop', climb: 'Climbing' };
const time = (at) => new Date(at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });

// The wire: what just happened among the runners, newest first.
export default function Wire({ events }) {
  if (!events.length) {
    return <p className="wire-empty">Nothing on the wire yet. Coins joining, milestones and big moves show up here as they happen.</p>;
  }
  return (
    <ol className="wire">
      {events.map((e) => (
        <li key={e.id} className={`wire-${e.type}`} title={LABEL[e.type] || 'Update'}>
          <time dateTime={new Date(e.at).toISOString()}>{time(e.at)}</time>
          <Link href={`/coin/${e.address}`} className="wire-item">
            <CoinImg address={e.address} src={e.image} name={e.name} symbol={e.symbol} size={26} />
            <span>
              <span className="wire-text"><b>{e.name}</b> {e.text}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
