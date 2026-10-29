'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import CoinImg from './CoinImg';

const ROWS = 6;
const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

// Score one guess against the answer, Wordle style (handles repeated letters).
function score(guess, answer) {
  const out = Array(guess.length).fill('no');
  const left = {};
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) out[i] = 'hit';
    else left[answer[i]] = (left[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < guess.length; i++) {
    if (out[i] === 'hit') continue;
    if (left[guess[i]]) { out[i] = 'near'; left[guess[i]]--; }
  }
  return out;
}

const decode = (s) => { try { return atob(s).split('').reverse().join(''); } catch { return ''; } };

// The daily ticker puzzle: guess one of today's runners by its ticker in six tries. Each miss
// unblurs its logo a little and reveals another clue. Progress is kept for the day.
export default function DailyPuzzle({ day, code, coin, clues }) {
  const answer = useMemo(() => decode(code), [code]);
  const len = answer.length;
  const key = `mt-puzzle-${day}`;
  const [guesses, setGuesses] = useState([]);
  const [cur, setCur] = useState('');
  const [shake, setShake] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(saved)) setGuesses(saved.filter((g) => typeof g === 'string' && g.length === len)); } catch {}
  }, [key, len]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(guesses)); } catch {} }, [key, guesses]);

  const won = guesses.includes(answer);
  const done = won || guesses.length >= ROWS;
  const misses = guesses.filter((g) => g !== answer).length;

  const press = useCallback((k) => {
    if (done) return;
    if (k === 'ENTER') {
      if (cur.length !== len) { setShake(true); setTimeout(() => setShake(false), 400); return; }
      setGuesses((g) => [...g, cur]);
      setCur('');
    } else if (k === 'BACK') setCur((c) => c.slice(0, -1));
    else if (/^[A-Z]$/.test(k) && cur.length < len) setCur((c) => c + k);
  }, [cur, len, done]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || /input|textarea/i.test(document.activeElement?.tagName || '')) return;
      if (!document.getElementById('puzzle')?.matches(':hover') && !document.activeElement?.closest?.('#puzzle')) return;
      const k = e.key === 'Enter' ? 'ENTER' : e.key === 'Backspace' ? 'BACK' : e.key.toUpperCase();
      if (k === 'ENTER' || k === 'BACK' || /^[A-Z]$/.test(k)) { e.preventDefault(); press(k); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  const keyState = useMemo(() => {
    const m = {};
    for (const g of guesses) score(g, answer).forEach((s, i) => {
      const c = g[i];
      if (m[c] === 'hit' || (m[c] === 'near' && s === 'no')) return;
      m[c] = s;
    });
    return m;
  }, [guesses, answer]);

  if (!len) return null;
  const shown = [...clues.slice(0, Math.min(clues.length, 1 + misses)), ...(done ? [] : [])];
  const blur = done ? 0 : Math.max(0, 14 - misses * 3);

  const share = () => {
    const grid = guesses.map((g) => score(g, answer).map((s) => (s === 'hit' ? '🟩' : s === 'near' ? '🟨' : '⬛')).join('')).join('\n');
    const text = `MetaTracker daily ticker ${day}: ${won ? guesses.length : 'X'}/${ROWS}\n${grid}`;
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(() => {});
  };

  return (
    <div className="pz" id="puzzle" tabIndex={-1}>
      <div className="pz-side">
        <div className="pz-logo" style={{ '--blur': `${blur}px` }}>
          <CoinImg address={coin.address} src={coin.image} name="?" symbol="?" size={88} />
        </div>
        <p className="pz-len">{len} letters, {ROWS - guesses.length} {ROWS - guesses.length === 1 ? 'try' : 'tries'} left</p>
        <ol className="pz-clues">
          {clues.map((c, i) => (
            <li key={i} className={i < shown.length || done ? 'is-on' : ''}>
              {i < shown.length || done ? c : `Clue ${i + 1} unlocks after ${i} ${i === 1 ? 'miss' : 'misses'}`}
            </li>
          ))}
        </ol>
        {done && (
          <div className="pz-end">
            <p><b>{won ? `Got it in ${guesses.length}.` : 'Out of tries.'}</b> It was <Link href={`/coin/${coin.address}`}>{coin.name} (${answer})</Link>.</p>
            <button type="button" className="btn btn-quiet btn-sm" onClick={share}>{copied ? 'Copied' : 'Copy result'}</button>
          </div>
        )}
      </div>

      <div className="pz-play">
        <div className="pz-grid" style={{ '--len': len }}>
          {Array.from({ length: ROWS }).map((_, r) => {
            const g = guesses[r];
            const live = r === guesses.length && !done;
            const marks = g ? score(g, answer) : [];
            return (
              <div key={r} className={`pz-row ${live && shake ? 'is-shake' : ''}`}>
                {Array.from({ length: len }).map((__, i) => {
                  const ch = g ? g[i] : live ? cur[i] || '' : '';
                  return <span key={i} className={`pz-cell ${g ? `is-${marks[i]}` : ch ? 'is-typed' : ''}`} style={{ '--d': `${i * 90}ms` }}>{ch}</span>;
                })}
              </div>
            );
          })}
        </div>
        <div className="pz-keys" aria-label="Keyboard">
          {KEYS.map((row, ri) => (
            <div key={row} className="pz-krow">
              {ri === 2 && <button type="button" className="pz-key pz-wide" onClick={() => press('ENTER')}>Enter</button>}
              {row.split('').map((k) => (
                <button key={k} type="button" className={`pz-key ${keyState[k] ? `is-${keyState[k]}` : ''}`} onClick={() => press(k)}>{k}</button>
              ))}
              {ri === 2 && <button type="button" className="pz-key pz-wide" onClick={() => press('BACK')} aria-label="Delete">Del</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
