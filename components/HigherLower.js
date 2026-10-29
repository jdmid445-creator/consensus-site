'use client';

import { useEffect, useState } from 'react';
import CoinImg from './CoinImg';
import { usd } from '@/lib/format';

// Higher or lower: which of two runners has the bigger market cap? Ten rounds a day.
export default function HigherLower({ day, pairs }) {
  const key = `mt-hl-${day}`;
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [pick, setPick] = useState(null);
  const [best, setBest] = useState(0);

  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(key) || 'null'); if (s) { setI(s.i || 0); setScore(s.score || 0); } setBest(Number(localStorage.getItem('mt-hl-best')) || 0); } catch {} }, [key]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify({ i, score })); } catch {} }, [key, i, score]);

  if (!pairs.length) return <p className="note">Not enough runners for a round right now.</p>;
  const done = i >= pairs.length;
  if (done) {
    return (
      <div className="hl-done">
        <p className="hl-score"><b>{score}</b>/{pairs.length}</p>
        <p className="note">{score >= 8 ? 'You know this board.' : score >= 5 ? 'Solid read on the field.' : 'Caps are hard to call. New pairs tomorrow.'}</p>
      </div>
    );
  }
  const p = pairs[i];
  const right = p.a.cap > p.b.cap ? 'a' : 'b';
  const choose = (side) => {
    if (pick) return;
    setPick(side);
    const ok = side === right;
    const next = score + (ok ? 1 : 0);
    if (ok) setScore(next);
    setTimeout(() => {
      setPick(null);
      setI((n) => n + 1);
      if (i + 1 >= pairs.length) { try { if (next > best) localStorage.setItem('mt-hl-best', String(next)); } catch {} }
    }, 1100);
  };
  const Card = ({ side, c }) => (
    <button type="button" className={`hl-card ${pick ? (side === right ? 'is-right' : side === pick ? 'is-wrong' : '') : ''}`} onClick={() => choose(side)} disabled={!!pick}>
      <CoinImg src={c.image} name={c.name} symbol={c.symbol} size={56} />
      <b>{c.name}</b>
      <span className="muted">${c.symbol}</span>
      <span className="hl-cap">{pick ? usd(c.cap) : 'Bigger cap?'}</span>
    </button>
  );
  return (
    <div className="hl">
      <p className="hl-top"><span>Round {i + 1} of {pairs.length}</span><span>Score {score}</span></p>
      <div className="hl-pair">
        <Card side="a" c={p.a} />
        <span className="hl-vs">vs</span>
        <Card side="b" c={p.b} />
      </div>
    </div>
  );
}
