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

  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    let timer;
    const load = (n) => {
      fetch(`/api/brief?a=${address}`)
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (stop) return;
          if (res.ok && !data.error) return setState({ status: 'done', b: data });
          // Try again on its own a couple of times before showing a message.
          if (n < 2 && res.status !== 404 && res.status !== 503) timer = setTimeout(() => load(n + 1), n === 0 ? 4000 : 10000);
          else setState({ status: 'error', error: data.error || 'The story couldn’t be written just now.' });
        })
        .catch(() => {
          if (stop) return;
          if (n < 2) timer = setTimeout(() => load(n + 1), 5000);
          else setState({ status: 'error', error: 'Couldn’t reach the desk.' });
        });
    };
    setState({ status: 'loading' });
    load(0);
    return () => { stop = true; clearTimeout(timer); };
  }, [address, enabled, tries]);

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
        <p className="note">
          {state.error}{' '}
          <button type="button" className="linkish" onClick={() => setTries((t) => t + 1)}>Try again</button>
        </p>
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
        Written from {sources.length ? sources.join(', ') : 'the coin’s public data'} and live market numbers. Claims made by a coin&apos;s creators aren&apos;t verified. Not financial advice.
      </p>
    </article>
  );
}
