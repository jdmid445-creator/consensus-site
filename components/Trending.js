'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import CoinImg from './CoinImg';
import LiveNumber from './LiveNumber';
import TypeBadge from './TypeBadge';
import useLive from './useLive';
import { usd, gain } from '@/lib/format';

const LIVE_WINDOWS = new Set(['h1', 'h6', 'h24']); // the ones DexScreener updates live

// Slides rows from their old spot to their new one when the order changes.
function useFlip(listRef, key) {
  const last = useRef(new Map());
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const now = new Map();
    el.querySelectorAll('[data-k]').forEach((node) => {
      const k = node.getAttribute('data-k');
      const box = node.getBoundingClientRect();
      now.set(k, box.top);
      const prev = last.current.get(k);
      if (reduce) return;
      if (prev == null) {
        node.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
      } else if (Math.abs(prev - box.top) > 1) {
        node.animate([{ transform: `translateY(${prev - box.top}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    });
    last.current = now;
  }, [listRef, key]);
}

export default function Trending({ windows, trending, runners, typeCounts }) {
  const [win, setWin] = useState('h1');
  const byAddr = useMemo(() => new Map(runners.map((r) => [r.address, r])), [runners]);
  const base = (trending[win] || []).map((a) => byAddr.get(a)).filter(Boolean);
  const live = useLive(base.map((r) => r.address), 5000);

  const value = (r) => (LIVE_WINDOWS.has(win) ? live[r.address]?.change?.[win] ?? r.change[win] : r.change[win]);
  const list = [...base].sort((a, b) => (value(b) ?? -Infinity) - (value(a) ?? -Infinity)).slice(0, 10);
  const max = Math.max(1, ...list.map((r) => Math.log10(Math.max(1.0001, 1 + (value(r) || 0) / 100))));
  const label = windows.find((w) => w.id === win)?.label;

  const listRef = useRef(null);
  useFlip(listRef, `${win}:${list.map((r) => r.address).join(',')}`);

  return (
    <div className="mv">
      <div className="mv-bar">
        <div className="seg" role="tablist" aria-label="Time window">
          {windows.map((w) => (
            <button key={w.id} type="button" role="tab" aria-selected={win === w.id} className="seg-btn" onClick={() => setWin(w.id)} disabled={!trending[w.id]?.length}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="mv-empty muted">No {label} numbers yet. They fill in within a few minutes.</p>
      ) : (
        <ol className="mv-list" ref={listRef} role="tabpanel" aria-label={`Biggest gains in the last ${label}`}>
          {list.map((r, i) => {
            const v = value(r);
            const cap = live[r.address]?.marketCap ?? r.marketCap;
            const vol = r.volume?.[win];
            const w = v > 0 ? Math.max(2, (Math.log10(1 + v / 100) / max) * 100) : 2;
            return (
              <li key={r.address} data-k={r.address}>
                <Link href={`/coin/${r.address}`} className="mv-row">
                  <span className="mv-rank">{i + 1}</span>
                  <CoinImg src={r.image} name={r.name} symbol={r.symbol} size={32} />
                  <span className="mv-id">
                    <strong>{r.name}</strong>
                    <span className="mv-sub">
                      <TypeBadge id={r.type} />
                      <span>${r.symbol}</span>
                      <span><LiveNumber value={cap} format={usd} /></span>
                    </span>
                    {r.why && <span className="mv-why">{r.why}</span>}
                  </span>
                  <span className="mv-meter" aria-hidden="true"><span className={v >= 0 ? 'fill-up' : 'fill-down'} style={{ width: `${w}%` }} /></span>
                  <span className="mv-val">
                    <LiveNumber value={v} format={gain} className={v >= 0 ? 'up' : 'down'} />
                    {vol != null && <span className="mv-vol">{usd(vol)} traded</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
