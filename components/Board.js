import CoinImg from './CoinImg';
import { usd, pct } from '@/lib/format';
import { themeById } from '@/lib/themes';

// The 50 runners as one wall of their own logos, grouped by theme so the meta reads at a glance.
export default function Board({ runners, themes }) {
  const order = new Map(themes.map((t, i) => [t.id, i]));
  const sorted = [...runners].sort((a, b) => (order.get(a.theme) ?? 99) - (order.get(b.theme) ?? 99) || a.rank - b.rank);
  return (
    <div className="board-wrap">
      <ol className="board" aria-label="The runners, grouped by theme">
        {sorted.map((r) => {
          const t = themeById(r.theme);
          return (
            <li key={r.address} style={{ '--c': t.color }}>
              <a className="tile" href={r.url} target="_blank" rel="noopener noreferrer" aria-label={`${r.name} ($${r.symbol}), ${usd(r.marketCap)}, ${t.name}`}>
                <CoinImg src={r.image} name={r.name} symbol={r.symbol} color={t.color} size={56} className="tile-img" />
                <span className="tile-card" aria-hidden="true">
                  <strong>{r.name}</strong>
                  <span className="muted">${r.symbol}</span>
                  <span className="num">{usd(r.marketCap)} <span className={r.change.h24 >= 0 ? 'up' : 'down'}>{pct(r.change.h24)}</span></span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
      <ul className="legend">
        {themes.map((t) => (
          <li key={t.id} style={{ '--c': t.color }}>
            <span className="sw" aria-hidden="true" />
            {t.name} <span className="muted num">{t.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
