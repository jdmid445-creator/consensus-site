import { usd } from '@/lib/format';

const price = (n) => (n >= 1000 ? `$${Math.round(n).toLocaleString('en-US')}` : `$${n.toFixed(2)}`);

// SOL, BTC, ETH and the size of today's field.
export default function MarketStrip({ markets, field }) {
  return (
    <div className="mkts" aria-label="Markets">
      <div className="wrap mkts-in">
        {markets.map((m) => (
          <span key={m.id} className="mkt">
            <b>{m.id}</b> {price(m.price)}
            {m.h24 != null && <span className={m.h24 >= 0 ? 'up' : 'down'}>{m.h24 >= 0 ? '+' : ''}{m.h24.toFixed(1)}%</span>}
          </span>
        ))}
        <span className="mkt mkt-field"><b>Runners</b> {field.count} coins, {usd(field.cap)} combined</span>
      </div>
    </div>
  );
}
