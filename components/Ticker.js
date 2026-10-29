'use client';

import Link from 'next/link';
import CoinImg from './CoinImg';
import useLive from './useLive';
import { gain } from '@/lib/format';

// The markets-channel tape: every runner and its live 24h move, scrolling.
// Pauses on hover and stays still for people who prefer reduced motion.
export default function Ticker({ runners }) {
  const live = useLive(runners.map((r) => r.address), 5000);
  const items = runners.map((r) => {
    const v = live[r.address]?.change?.h24 ?? r.change.h24;
    return (
      <Link key={r.address} href={`/coin/${r.address}`} className="tp-item" tabIndex={-1}>
        <CoinImg src={r.image} name={r.name} symbol={r.symbol} size={18} />
        <span className="tp-sym">${r.symbol}</span>
        <span className={`tp-val ${v >= 0 ? 'up' : 'down'}`}>{v >= 0 ? '▲' : '▼'} {gain(v).replace(/^[+-]/, '')}</span>
      </Link>
    );
  });
  const seconds = Math.max(40, runners.length * 3.2);
  return (
    <div className="tape" aria-label="Live 24-hour moves for every runner">
      <span className="tp-label">24h</span>
      <div className="tp-view">
        <div className="tp-track" style={{ '--dur': `${seconds}s` }}>
          <div className="tp-run">{items}</div>
          <div className="tp-run" aria-hidden="true">{items}</div>
        </div>
      </div>
    </div>
  );
}
