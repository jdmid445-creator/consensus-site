'use client';

import { useEffect, useState } from 'react';
import CoinImg from './CoinImg';

const decode = (s) => { try { return atob(s).split('').reverse().join(''); } catch { return ''; } };

// Name that logo: six of today's runners, four names each.
export default function LogoQuiz({ day, rounds }) {
  const key = `mt-logo-${day}`;
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [pick, setPick] = useState(null);

  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(key) || 'null'); if (s) { setI(s.i || 0); setScore(s.score || 0); } } catch {} }, [key]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify({ i, score })); } catch {} }, [key, i, score]);

  if (!rounds.length) return <p className="note">Not enough logos for a quiz right now.</p>;
  if (i >= rounds.length) {
    return (
      <div className="hl-done">
        <p className="hl-score"><b>{score}</b>/{rounds.length}</p>
        <p className="note">{score === rounds.length ? 'Perfect. You live on the dex feed.' : 'New logos tomorrow.'}</p>
      </div>
    );
  }
  const q = rounds[i];
  const answer = decode(q.answer);
  const choose = (id) => {
    if (pick) return;
    setPick(id);
    if (id === answer) setScore((s) => s + 1);
    setTimeout(() => { setPick(null); setI((n) => n + 1); }, 1100);
  };
  return (
    <div className="lq">
      <p className="hl-top"><span>Logo {i + 1} of {rounds.length}</span><span>Score {score}</span></p>
      <div className="lq-img"><CoinImg src={q.image} name="?" symbol="?" size={96} /></div>
      <div className="lq-opts">
        {q.options.map((o) => (
          <button key={o.id} type="button" className={`lq-opt ${pick ? (o.id === answer ? 'is-right' : o.id === pick ? 'is-wrong' : '') : ''}`} onClick={() => choose(o.id)} disabled={!!pick}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}
