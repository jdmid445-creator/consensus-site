'use client';

import { useMemo, useState } from 'react';
import CoinImg from './CoinImg';
import LiveNumber from './LiveNumber';
import TypeBadge, { TypeKey } from './TypeBadge';
import useLive from './useLive';
import { usd, pct } from '@/lib/format';

const LIVE_WINDOWS = new Set(['h1', 'h6', 'h24']); // the ones DexScreener updates live

export default function Trending({ windows, trending, runners, typeCounts }) {
  const [win, setWin] = useState('h1');
  const byAddr = useMemo(() => new Map(runners.map((r) => [r.address, r])), [runners]);
  const base = (trending[win] || []).map((a) => byAddr.get(a)).filter(Boolean);
  const live = useLive(base.map((r) => r.address));

  const value = (r) => (LIVE_WINDOWS.has(win) ? live[r.address]?.change?.[win] ?? r.change[win] : r.change[win]);
  // keep the ranking true to the live numbers
  const list = [...base].sort((a, b) => (value(b) ?? -Infinity) - (value(a) ?? -Infinity));
  const max = Math.max(1, ...list.map((r) => Math.abs(value(r) || 0)));
  const label = windows.find((w) => w.id === win)?.label;

  return (
    <div className="trend">
      <div className="trend-bar">
        <div className="seg" role="tablist" aria-label="Time window">
          {windows.map((w) => (
            <button key={w.id} type="button" role="tab" aria-selected={win === w.id} className="seg-btn" onClick={() => setWin(w.id)} disabled={!trending[w.id]?.length}>
              {w.label}
            </button>
          ))}
        </div>
        <TypeKey counts={typeCounts} />
      </div>

      {list.length === 0 ? (
        <p className="trend-empty muted">No {label} numbers yet. They fill in within a few minutes.</p>
      ) : (
        <ol className="trend-list" style={{ '--rows': Math.ceil(list.length / 2) }} role="tabpanel" aria-label={`Biggest gains in the last ${label}`}>
          {list.map((r, i) => {
            const v = value(r);
            const cap = live[r.address]?.marketCap ?? r.marketCap;
            const vol = r.volume?.[win];
            return (
              <li key={r.address}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="trend-row">
                  <span className="trend-rank num muted">{i + 1}</span>
                  <CoinImg src={r.image} name={r.name} symbol={r.symbol} size={36} />
                  <span className="trend-id">
                    <strong>{r.name}</strong>
                    <span className="trend-sub">
                      <TypeBadge id={r.type} />
                      <span className="muted">${r.symbol}</span>
                      <span className="muted num"><LiveNumber value={cap} format={usd} /></span>
                    </span>
                  </span>
                  <span className="trend-meter" aria-hidden="true">
                    <span className={v >= 0 ? 'fill-up' : 'fill-down'} style={{ width: `${Math.max(3, (Math.abs(v || 0) / max) * 100)}%` }} />
                  </span>
                  <span className="trend-val">
                    <LiveNumber value={v} format={(x) => pct(x)} className={`num ${v >= 0 ? 'up' : 'down'}`} />
                    {vol != null && <span className="small muted num">{usd(vol)} vol</span>}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
