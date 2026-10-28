import Link from 'next/link';
import CoinImg from './CoinImg';
import { usd, gain } from '@/lib/format';

// The field: every runner's logo, grouped by theme (biggest theme first), with its 24h move.
export default function Board({ runners, themes }) {
  const order = new Map(themes.map((t, i) => [t.id, i]));
  const tMap = new Map(themes.map((t) => [t.id, t]));
  const sorted = [...runners].sort((a, b) => (order.get(a.theme) ?? 99) - (order.get(b.theme) ?? 99) || a.rank - b.rank);
  return (
    <div className="field-grid">
      <ol className="board" aria-label="Every runner, grouped by theme">
        {sorted.map((r, i) => {
          const t = tMap.get(r.theme);
          const v = r.change.h24;
          return (
            <li key={r.address} style={{ '--i': i, '--c': t?.color }}>
              <Link className="tile" href={`/coin/${r.address}`} aria-label={`${r.name} ($${r.symbol}), ${usd(r.marketCap)}, ${gain(v)} in 24 hours, ${t?.name}`}>
                <CoinImg src={r.image} name={r.name} symbol={r.symbol} size={56} className="tile-img" />
                <span className="tile-sym">${r.symbol}</span>
                <span className={`tile-gain ${v >= 0 ? 'up' : 'down'}`}>{gain(v)}</span>
                <span className="tile-card" aria-hidden="true">
                  <strong>{r.name}</strong>
                  <span>{usd(r.marketCap)} market cap</span>
                  <span>{t?.name}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
