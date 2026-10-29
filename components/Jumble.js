'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CoinImg from './CoinImg';

const decode = (s) => { try { return atob(s).split('').reverse().join(''); } catch { return ''; } };

// The Jumble: one of today's runners with its name scrambled.
export default function Jumble({ day, data }) {
  const answer = decode(data.code);
  const key = `mt-jumble-${day}`;
  const [val, setVal] = useState('');
  const [state, setState] = useState('play'); // play | won | gave
  const [tries, setTries] = useState(0);
  const [hint, setHint] = useState(false);

  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(key) || 'null'); if (s?.state) { setState(s.state); setTries(s.tries || 0); } } catch {} }, [key]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify({ state, tries })); } catch {} }, [key, state, tries]);

  const norm = (s) => s.toUpperCase().replace(/[^A-Z]/g, '');
  const submit = (e) => {
    e.preventDefault();
    if (!val.trim()) return;
    setTries((t) => t + 1);
    if (norm(val) === norm(answer)) setState('won');
    setVal('');
  };

  return (
    <div className="jb">
      <div className="jb-words" aria-label="Scrambled name">
        {data.scrambled.map((w, i) => (
          <span key={i} className="jb-word">
            {w.split('').map((c, k) => <span key={k} className="jb-tile" style={{ '--d': `${k * 50}ms` }}>{c}</span>)}
          </span>
        ))}
      </div>
      {state === 'play' ? (
        <>
          <form className="jb-form" onSubmit={submit}>
            <input className="input" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Unscramble the coin's name" aria-label="Your answer" />
            <button className="btn btn-ink" type="submit">Check</button>
          </form>
          <p className="jb-meta">
            {tries > 0 && <span>Not it, {tries} {tries === 1 ? 'try' : 'tries'} so far. </span>}
            {hint ? <span>Hint: {data.hint}</span> : <button type="button" className="linkish" onClick={() => setHint(true)}>Show a hint</button>}
            {tries >= 2 && <> · <button type="button" className="linkish" onClick={() => setState('gave')}>Give up</button></>}
          </p>
        </>
      ) : (
        <div className="jb-done">
          <CoinImg address={data.coin.address} src={data.coin.image} name={data.coin.name} symbol={data.coin.symbol} size={40} />
          <p><b>{state === 'won' ? `Solved in ${tries}.` : 'The answer:'}</b> <Link href={`/coin/${data.coin.address}`}>{data.coin.name} (${data.coin.symbol})</Link></p>
        </div>
      )}
    </div>
  );
}
