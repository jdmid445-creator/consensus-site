'use client';

import LiveNumber from './LiveNumber';
import useLive from './useLive';
import { usd } from '@/lib/format';

const price = (n) => (n == null ? '–' : n >= 1000 ? `$${Math.round(n).toLocaleString('en-US')}` : `$${n.toFixed(2)}`);
const ch = (v) => (v == null ? '' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`);

// SOL, BTC and ETH (live), and the size of today's field.
export default function MarketStrip({ markets, field }) {
  const live = useLive(markets.map((m) => m.address), 5000);
  return (
    <div className="mkts" aria-label="Markets">
      <div className="wrap mkts-in">
        {markets.map((m) => {
          const p = live[m.address]?.priceUsd ?? m.price;
          const h = live[m.address]?.change?.h24 ?? m.h24;
          return (
            <span key={m.id} className="mkt">
              <b>{m.id}</b> <LiveNumber value={p} format={price} />
              {h != null && <LiveNumber value={h} format={ch} className={h >= 0 ? 'up' : 'down'} />}
            </span>
          );
        })}
        <span className="mkt mkt-field"><b>Runners</b> {field.count} coins, {usd(field.cap)} combined</span>
      </div>
    </div>
  );
}
