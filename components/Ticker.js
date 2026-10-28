'use client';

import CoinImg from './CoinImg';
import useLive from './useLive';
import { gain } from '@/lib/format';

// The markets-channel tape: every runner and its live 24h move, scrolling.
// Pauses on hover and stays still for people who prefer reduced motion.
export default function Ticker({ runners }) {
  const live = useLive(runners.slice(0, 30).map((r) => r.address), 20000);
  const items = runners.map((r) => {
    const v = live[r.address]?.change?.h24 ?? r.change.h24;
    return (
      <a key={r.address} href={r.url} target="_blank" rel="noopener noreferrer" className="tp-item">
        <CoinImg src={r.image} name={r.name} symbol={r.symbol} size={18} />
        <span className="tp-sym">${r.symbol}</span>
        <span className={`tp-val ${v >= 0 ? 'up' : 'down'}`}>{v >= 0 ? '▲' : '▼'} {gain(v).replace(/^[+-]/, '')}</span>
      </a>
    );
  });
  const seconds = Math.max(40, runners.length * 3.2);
  return (
    <div className="tape" aria-label="Live 24-hour moves for every runner">
      <div className="tp-track" style={{ '--dur': `${seconds}s` }}>
        <div className="tp-run">{items}</div>
        <div className="tp-run" aria-hidden="true">{items}</div>
      </div>
    </div>
  );
}
