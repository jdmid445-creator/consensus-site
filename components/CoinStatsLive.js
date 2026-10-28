'use client';

import LiveNumber from './LiveNumber';
import useLive from './useLive';
import { usd, pct, gain } from '@/lib/format';

const share = (b, s) => (b != null && s != null && b + s > 0 ? b / (b + s) : null);

// The coin page's market numbers, all live (every 2 seconds).
export default function CoinStatsLive({ r }) {
  const live = useLive([r.address], 2000);
  const L = live[r.address] || {};
  const cap = L.marketCap ?? r.marketCap;
  const liq = L.liquidity ?? r.liquidity;
  const vol24 = L.volume?.h24 ?? r.volume24h;
  const vol1 = L.volume?.h1 ?? r.volume?.h1 ?? null;
  const buys = L.buys24h ?? r.buys24h;
  const sells = L.sells24h ?? r.sells24h;
  const bs = share(buys, sells);
  const ch = { m5: L.change?.m5 ?? r.change.m5 ?? null, h1: L.change?.h1 ?? r.change.h1, h6: L.change?.h6 ?? r.change.h6, h24: L.change?.h24 ?? r.change.h24 };
  const tone = (v) => (v == null ? '' : v >= 0 ? 'up' : 'down');
  return (
    <dl className="kv">
      <div><dt>Market cap</dt><dd><LiveNumber value={cap} format={usd} /></dd></div>
      <div><dt>Liquidity</dt><dd><LiveNumber value={liq} format={usd} /></dd></div>
      <div><dt>Volume, 24h</dt><dd><LiveNumber value={vol24} format={usd} /></dd></div>
      {vol1 != null && <div><dt>Volume, 1h</dt><dd><LiveNumber value={vol1} format={usd} /></dd></div>}
      {bs != null && (
        <div>
          <dt>Buys vs sells, 24h</dt>
          <dd><LiveNumber value={Math.round(bs * 100)} format={(v) => `${v}% buys`} /> <small className="kv-sub">{(buys ?? 0).toLocaleString('en-US')} / {(sells ?? 0).toLocaleString('en-US')}</small></dd>
        </div>
      )}
      {ch.m5 != null && <div><dt>5 minutes</dt><dd><LiveNumber value={ch.m5} format={pct} className={tone(ch.m5)} /></dd></div>}
      <div><dt>1 hour</dt><dd><LiveNumber value={ch.h1} format={gain} className={tone(ch.h1)} /></dd></div>
      <div><dt>6 hours</dt><dd><LiveNumber value={ch.h6} format={gain} className={tone(ch.h6)} /></dd></div>
      <div><dt>24 hours</dt><dd><LiveNumber value={ch.h24} format={gain} className={tone(ch.h24)} /></dd></div>
    </dl>
  );
}
