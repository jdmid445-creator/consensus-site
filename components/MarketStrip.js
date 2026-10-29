'use client';

import Link from 'next/link';
import CoinImg from './CoinImg';
import LiveNumber from './LiveNumber';
import useLive from './useLive';

const price = (n) => {
  if (n == null) return '–';
  if (n >= 1000) return `$${Math.round(n).toLocaleString('en-US')}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toPrecision(3)}`;
};
const ch = (v) => (v == null ? '' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`);

// Majors and the big Solana coins, live.
export default function MarketStrip({ markets, field }) {
  const live = useLive(markets.map((m) => m.address), 5000);
  return (
    <div className="mkts" aria-label="Markets">
      <div className="mkts-in">
        {markets.map((m) => {
          const p = live[m.address]?.priceUsd ?? m.price;
          const h = live[m.address]?.change?.h24 ?? m.h24;
          return (
            <Link key={m.id} href={`/coin/${m.address}`} className="mkt" title={`${m.name}: chart and stats`}>
              {m.image && <CoinImg src={m.image} name={m.name} symbol={m.id} size={16} />}
              <b>{m.id}</b> <LiveNumber value={p} format={price} />
              {h != null && <LiveNumber value={h} format={ch} className={h >= 0 ? 'up' : 'down'} />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
