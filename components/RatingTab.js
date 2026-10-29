'use client';

import { useEffect, useMemo, useState } from 'react';
import useLive from './useLive';
import { buzz } from '@/lib/buzz';

const ROWS = [
  ['originality', 'Originality'],
  ['memeability', 'Meme-ability'],
  ['metaFit', 'Fits today’s meta'],
  ['stayingPower', 'Staying power'],
];

function Meter({ value, max = 10 }) {
  return (
    <span className="rt-meter" aria-hidden="true">
      <span style={{ width: `${(value / max) * 100}%` }} />
    </span>
  );
}

// The Rating tab: our read of the narrative (scored 1-10) and the live Buzz score.
export default function RatingTab({ r, active, aiOn, themeCount, heat }) {
  const [brief, setBrief] = useState({ status: aiOn ? 'loading' : 'off' });
  const [holders, setHolders] = useState(null);
  const live = useLive(active ? [r.address] : [], 3000);
  const L = live[r.address] || {};

  useEffect(() => {
    if (!active) return;
    let stop = false;
    if (aiOn && brief.status === 'loading') {
      fetch(`/api/brief?a=${r.address}`)
        .then(async (res) => {
          const d = await res.json().catch(() => ({}));
          if (!stop) setBrief(res.ok && !d.error ? { status: 'done', d } : { status: 'error' });
        })
        .catch(() => !stop && setBrief({ status: 'error' }));
    }
    if (holders == null) {
      fetch(`/api/onchain?a=${r.address}`)
        .then((res) => res.json())
        .then((d) => !stop && d?.holders != null && setHolders(d.holders))
        .catch(() => {});
    }
    return () => { stop = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, r.address]);

  const b = useMemo(
    () => buzz({
      buys: L.buys24h ?? r.buys24h,
      sells: L.sells24h ?? r.sells24h,
      volume24h: L.volume?.h24 ?? r.volume24h,
      marketCap: L.marketCap ?? r.marketCap,
      h1: L.change?.h1 ?? r.change.h1,
      holders,
      socials: r.socials || {},
      paidProfile: r.paidProfile,
      boosts: r.boosts,
      cto: r.cto,
      themeCount,
      heat,
    }),
    [L, r, holders, themeCount, heat],
  );

  const rating = brief.d?.rating;
  return (
    <div className="rt">
      <section className="rt-card">
        <div className="rt-head">
          <div>
            <h2 className="h3">Narrative rating</h2>
            <p className="note">How strong the idea behind the coin is, scored 1 to 10.</p>
          </div>
          {rating && <p className="rt-big"><b>{rating.overall}</b><span>/10</span></p>}
        </div>
        {brief.status === 'off' && <p className="note">Ratings are written for today&apos;s runners only.</p>}
        {brief.status === 'error' && <p className="note">The rating couldn&apos;t be written just now. Open this tab again in a minute.</p>}
        {brief.status === 'loading' && <div className="cs-skel"><span /><span /><span /><span /></div>}
        {brief.status === 'done' && !rating && <p className="note">This coin&apos;s rating will appear when its story next refreshes.</p>}
        {rating && (
          <>
            <dl className="rt-rows">
              {ROWS.map(([k, label]) => (
                <div key={k}>
                  <dt>{label}</dt>
                  <dd><Meter value={rating[k] || 0} /><b>{rating[k] ?? '–'}</b></dd>
                </div>
              ))}
            </dl>
            {rating.verdict && <p className="rt-verdict">{rating.verdict}</p>}
          </>
        )}
      </section>

      <section className="rt-card">
        <div className="rt-head">
          <div>
            <h2 className="h3">Buzz</h2>
            <p className="note">How much attention it&apos;s getting right now. Updates live.</p>
          </div>
          <p className={`rt-big rt-buzz rt-${b.label.toLowerCase().replace(' ', '-')}`}><b>{b.score}</b><span>{b.label}</span></p>
        </div>
        <span className="rt-gauge" aria-hidden="true"><span style={{ width: `${b.score}%` }} /></span>
        <dl className="rt-rows">
          {b.parts.map((p) => (
            <div key={p.id}>
              <dt>{p.label}<small>{p.detail}</small></dt>
              <dd><Meter value={p.score} max={100} /><b>{p.score}</b></dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
