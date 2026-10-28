'use client';

import LiveNumber from './LiveNumber';
import useLive from './useLive';
import { usd, gain, pct } from '@/lib/format';

// The live numbers at the top of a coin page.
export default function CoinLive({ r }) {
  const live = useLive([r.address]);
  const L = live[r.address];
  const h24 = L?.change?.h24 ?? r.change.h24;
  const h1 = L?.change?.h1 ?? r.change.h1;
  const cap = L?.marketCap ?? r.marketCap;
  const price = L?.priceUsd ?? r.priceUsd;
  const fmtPrice = (n) => (n == null ? '–' : n >= 1 ? `$${n.toFixed(2)}` : `$${n.toPrecision(3)}`);
  return (
    <div className="ch-live">
      <div className="ch-gain">
        <LiveNumber value={h24} format={gain} className={h24 >= 0 ? 'up' : 'down'} />
        <span>24 hours</span>
      </div>
      <dl>
        <div><dt>Market cap</dt><dd><LiveNumber value={cap} format={usd} /></dd></div>
        <div><dt>Price</dt><dd><LiveNumber value={price} format={fmtPrice} /></dd></div>
        <div><dt>Last hour</dt><dd><LiveNumber value={h1} format={pct} className={h1 >= 0 ? 'up' : 'down'} /></dd></div>
      </dl>
    </div>
  );
}
