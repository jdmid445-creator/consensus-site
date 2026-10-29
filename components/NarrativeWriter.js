'use client';

import { useState } from 'react';
import CoinImg from './CoinImg';
import CopyText from './CopyText';
import { Spark, Redo } from './Icons';

export default function NarrativeWriter({ narratives, enabled }) {
  const [theme, setTheme] = useState('');
  const [angle, setAngle] = useState('');
  const [state, setState] = useState({ status: 'idle' });

  async function write() {
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/narrative', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ theme, angle }),
      });
      const data = await res.json();
      if (!res.ok || data.error) setState({ status: 'error', error: data.error || 'Something went wrong. Try again.' });
      else setState({ status: 'done', n: data });
    } catch {
      setState({ status: 'error', error: 'Couldn\'t reach the writer. Check your connection and try again.' });
    }
  }

  const n = state.n;
  const loading = state.status === 'loading';

  return (
    <div className="writer">
      <form className="writer-controls" onSubmit={(e) => { e.preventDefault(); if (enabled && !loading) write(); }}>
        <fieldset className="field">
          <legend className="field-label">Ride a narrative</legend>
          <div className="chips">
            <button type="button" className="chip" aria-pressed={theme === ''} onClick={() => setTheme('')}>Strongest right now</button>
            {narratives.map((name) => (
              <button key={name} type="button" className="chip" aria-pressed={theme === name} onClick={() => setTheme(name)}>{name}</button>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <span className="field-label">Your angle, if you have one</span>
          <input className="input" value={angle} onChange={(e) => setAngle(e.target.value)} maxLength={140} placeholder="A raccoon that lives in a server room" />
        </label>
        <button type="submit" className="btn btn-ink" disabled={!enabled || loading}>
          {n ? <Redo /> : <Spark />}
          {loading ? 'Writing…' : n ? 'Write another' : 'Write a narrative'}
        </button>
        {!enabled && <p className="small muted">The narrative writer is switched off on this site right now.</p>}
        {state.status === 'error' && <p className="small error" role="alert">{state.error}</p>}
      </form>

      <article className={`sheet ${loading ? 'is-loading' : ''}`} aria-live="polite" aria-busy={loading}>
        {!n && (
          <div className="sheet-empty">
            <p className="sheet-empty-lead">Your coin idea shows up here.</p>
            <dl>
              <div><dt>Name and ticker</dt><dd>Original, never a live ticker</dd></div>
              <div><dt>The lore</dt><dd>A few short paragraphs</dd></div>
              <div><dt>Why it fits today</dt><dd>The runners it sits next to</dd></div>
              <div><dt>Logo direction</dt><dd>Readable as a small avatar</dd></div>
              <div><dt>First post</dt><dd>No ticker or CA in it</dd></div>
            </dl>
          </div>
        )}
        {n && (
          <>
            <header className="sheet-head">
              <p className="ticker">{n.ticker}</p>
              <h3>{n.name}</h3>
              <p className="hook">{n.hook}</p>
              {n.tickerTaken && <p className="small error">That ticker is already used by a current runner. Write another for a fresh one.</p>}
            </header>
            <div className="sheet-body">
              <section>
                <h4>The lore</h4>
                {n.story.map((p, i) => <p key={i}>{p}</p>)}
              </section>
              <section>
                <h4>Why it fits today</h4>
                <ul className="ticks">{n.whyNow.map((p, i) => <li key={i}>{p}</li>)}</ul>
                {n.fits.length > 0 && (
                  <div className="fits">
                    {n.fits.map((f) => (
                      <a key={f.address} href={f.url} target="_blank" rel="noopener noreferrer" className="fit">
                        <CoinImg address={f.address} src={f.image} name={f.name} symbol={f.symbol} size={22} /> ${f.symbol}
                      </a>
                    ))}
                  </div>
                )}
              </section>
              <section>
                <h4>Logo direction</h4>
                <p>{n.look}</p>
              </section>
              <section>
                <h4>First post</h4>
                <blockquote className="post">{n.firstPost}</blockquote>
                <CopyText text={n.firstPost} label="Copy post" />
              </section>
            </div>
          </>
        )}
      </article>
    </div>
  );
}
