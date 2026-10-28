'use client';

import { useEffect, useState } from 'react';

const SOURCE_TEXT = {
  description: 'its DexScreener description',
  'launch metadata': 'its launch metadata',
  website: 'its website',
  'name only': 'its name and links',
};

// Fetches the AI-written story for one coin (cached server-side for 2 hours).
export default function CoinStory({ address, enabled, why }) {
  const [state, setState] = useState({ status: enabled ? 'loading' : 'off' });

  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    fetch(`/api/brief?a=${address}`)
      .then(async (res) => {
        const data = await res.json();
        if (stop) return;
        setState(res.ok && !data.error ? { status: 'done', b: data } : { status: 'error', error: data.error });
      })
      .catch(() => !stop && setState({ status: 'error', error: 'Couldn’t reach the desk. Reload to try again.' }));
    return () => { stop = true; };
  }, [address, enabled]);

  if (state.status === 'off') {
    return why ? <p className="story-why">{why}</p> : null;
  }

  if (state.status === 'loading') {
    return (
      <div className="cs cs-loading" aria-busy="true" aria-live="polite">
        {why && <p className="story-why">{why}</p>}
        <p className="note">Writing this coin&apos;s story from its description, launch metadata and website…</p>
        <div className="cs-skel"><span /><span /><span /><span /></div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="cs">
        {why && <p className="story-why">{why}</p>}
        <p className="note">{state.error}</p>
      </div>
    );
  }

  const b = state.b;
  const sources = (b.sources || []).map((s) => SOURCE_TEXT[s]).filter(Boolean);
  return (
    <article className="cs" aria-live="polite">
      <h2 className="cs-head">{b.headline}</h2>
      <section>
        <h3>The backstory</h3>
        {b.backstory.map((p, i) => <p key={i}>{p}</p>)}
      </section>
      <section>
        <h3>Why it&apos;s trending</h3>
        <ul className="ticks">{b.whyTrending.map((p, i) => <li key={i}>{p}</li>)}</ul>
      </section>
      <section>
        <h3>Keep in mind</h3>
        <ul className="cs-watch">{b.watch.map((p, i) => <li key={i}>{p}</li>)}</ul>
      </section>
      <p className="note cs-src">
        Written by Claude from {sources.length ? sources.join(', ') : 'the coin’s public data'} and live market numbers. Claims made by a coin&apos;s creators aren&apos;t verified. Not financial advice.
      </p>
    </article>
  );
}
