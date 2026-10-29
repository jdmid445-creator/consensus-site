'use client';

import Link from 'next/link';
import CoinImg from './CoinImg';
import LiveNumber from './LiveNumber';
import useLive from './useLive';
import { usd, gain, age } from '@/lib/format';

// The newest coins on the board: the youngest of today's runners, live.
export default function NewRunners({ coins }) {
  const live = useLive(coins.map((c) => c.address), 5000);
  return (
    <div className="rail">
      <ol className="rail-list">
        {coins.map((c, i) => {
          const v = live[c.address]?.change?.h24 ?? c.change.h24;
          const cap = live[c.address]?.marketCap ?? c.marketCap;
          return (
            <li key={c.address} style={{ '--i': i }}>
              <Link href={`/coin/${c.address}`} className="rail-item">
                <CoinImg address={c.address} src={c.image} name={c.name} symbol={c.symbol} size={34} />
                <span className="rail-id">
                  <strong>{c.name}</strong>
                  <span className="rail-sub">
                    <span>{age(c.ageHours)} old</span>
                    <LiveNumber value={cap} format={usd} />
                  </span>
                </span>
                <LiveNumber value={v} format={gain} className={`rail-gain ${v >= 0 ? 'up' : 'down'}`} />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
