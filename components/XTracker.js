'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Widget from './Widget';
import CoinImg from './CoinImg';

const k = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K` : String(n));
const ago = (iso, now) => {
  const s = Math.max(0, Math.round((now - new Date(iso)) / 1000));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`;
};

const LANES = [
  ['all', 'All'],
  ['runners', 'Runners'],
  ['big', 'Big accounts'],
];
const TYPES = [
  ['post', 'Posts'],
  ['reply', 'Replies'],
  ['quote', 'Quotes'],
  ['repost', 'Reposts'],
];

function Post({ p, now, isNew }) {
  return (
    <li className={isNew ? 'xp-new' : undefined}>
      <a href={`https://x.com/${p.author.handle}`} target="_blank" rel="noopener noreferrer" className="xp-av">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.author.avatar} alt="" width={40} height={40} loading="lazy" />
      </a>
      <div className="xp-body">
        <p className="xp-who">
          <b>{p.author.name}</b>
          <span>@{p.author.handle} · {k(p.author.followers)}</span>
          <time dateTime={p.createdAt}>{ago(p.createdAt, now)}</time>
        </p>
        {p.type !== 'post' && (
          <p className={`xp-kind xp-kind-${p.type}`}>
            {p.type === 'reply' ? `Replying to @${p.replyTo || '…'}` : p.type === 'quote' ? 'Quoted' : `Reposted @${p.reposted?.handle || ''}`}
          </p>
        )}
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="xp-text">{p.text.replace(/\n{2,}/g, '\n')}</a>
        {p.quoted && (
          <div className="xp-quote">
            <p className="xp-who"><b>{p.quoted.name}</b><span>@{p.quoted.handle}</span></p>
            <p>{p.quoted.text}</p>
          </div>
        )}
        {p.img && (
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="xp-img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.img} alt="" loading="lazy" />
          </a>
        )}
        <div className="xp-foot">
          <span className="xp-coins">
            {p.lane === 'big' && <span className="xp-big">Big account</span>}
            {p.coins.map((c) => (
              <Link key={c.address} href={`/coin/${c.address}`} className="xp-coin">
                <CoinImg address={c.address} src={c.image} name={c.name} symbol={c.symbol} size={18} />
                {c.symbol}
              </Link>
            ))}
          </span>
          <span className="xp-stats">{k(p.likes)} likes · {k(p.reposts)} reposts</span>
        </div>
      </div>
    </li>
  );
}

// The live feed: polls every few seconds, freezes while the pointer is on the posts and
// catches up when it leaves.
export default function XTracker({ initial }) {
  const [live, setLive] = useState(initial);
  const [shown, setShown] = useState(initial);
  const [hover, setHover] = useState(false);
  const [lane, setLane] = useState('all');
  const [types, setTypes] = useState(new Set(TYPES.map(([t]) => t)));
  const [now, setNow] = useState(() => Date.now());
  const seen = useRef(new Set(initial.posts.map((p) => p.id)));
  const [fresh, setFresh] = useState(new Set());

  useEffect(() => {
    let stop = false;
    let timer;
    const tick = async () => {
      if (!document.hidden) {
        try {
          const r = await fetch('/api/x/live', { cache: 'no-store' });
          if (r.ok) { const j = await r.json(); if (!stop && j.posts) setLive(j); }
        } catch {}
      }
      if (!stop) timer = setTimeout(tick, 3000);
    };
    timer = setTimeout(tick, 3000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { stop = true; clearTimeout(timer); clearInterval(clock); };
  }, []);

  useEffect(() => {
    if (hover) return;
    const ids = live.posts.map((p) => p.id);
    setFresh(new Set(ids.filter((id) => !seen.current.has(id))));
    seen.current = new Set(ids);
    setShown(live);
  }, [live, hover]);

  const waiting = hover ? live.posts.filter((p) => !seen.current.has(p.id)).length : 0;
  const list = useMemo(
    () => shown.posts.filter((p) => (lane === 'all' || p.lane === lane) && types.has(p.type)).slice(0, 80),
    [shown, lane, types],
  );
  const flip = (t) => setTypes((s) => { const n = new Set(s); if (n.has(t)) { if (n.size > 1) n.delete(t); } else n.add(t); return n; });

  return (
    <div className="row row-x">
      <Widget title="The feed" className="wg-xfeed">
        <div className="x-bar">
          <div className="seg seg-sm x-seg" role="tablist">
            {LANES.map(([id, label]) => (
              <button key={id} type="button" role="tab" className="seg-btn" aria-selected={lane === id} onClick={() => setLane(id)}>{label}</button>
            ))}
          </div>
          <span className={`x-live${hover ? ' is-paused' : ''}`}>
            <i aria-hidden="true" />
            {hover ? (waiting ? `${waiting} new` : 'Paused') : 'Live'}
          </span>
        </div>
        <div className="chips x-types">
          {TYPES.map(([id, label]) => (
            <button key={id} type="button" className="chip" aria-pressed={types.has(id)} onClick={() => flip(id)}>{label}</button>
          ))}
        </div>
        {list.length ? (
          <ul className="xp" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            {list.map((p) => <Post key={p.id} p={p} now={now} isNew={fresh.has(p.id)} />)}
          </ul>
        ) : (
          <p className="muted x-empty">Nothing yet. New posts show up here a few seconds after they go up.</p>
        )}
      </Widget>
      <div className="x-side">
        <Widget title="Most talked about" note="last 6h" className="wg-xtalk">
          {shown.talked.length ? (
            <ol className="xt">
              {shown.talked.map((c, i) => (
                <li key={c.address}>
                  <Link href={`/coin/${c.address}`}>
                    <span className="xt-rank">{i + 1}</span>
                    <CoinImg address={c.address} src={c.coin.image} name={c.coin.name} symbol={c.coin.symbol} size={28} />
                    <span className="xt-name">{c.coin.name}<small>{c.posts} {c.posts === 1 ? 'post' : 'posts'} · {k(c.reach)} reach</small></span>
                    <b title="accounts posting">{c.accounts}</b>
                  </Link>
                </li>
              ))}
            </ol>
          ) : <p className="muted x-empty">No posts about today&apos;s runners yet.</p>}
        </Widget>
        <Widget title="Biggest accounts posting" note="last 6h" className="wg-xloud">
          {shown.loud.length ? (
            <ul className="xl">
              {shown.loud.map((a) => (
                <li key={a.handle}>
                  <a href={`https://x.com/${a.handle}`} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.avatar} alt="" width={32} height={32} loading="lazy" />
                    <span className="xl-name">{a.name}<small>@{a.handle}</small></span>
                    <b>{k(a.followers)}</b>
                  </a>
                </li>
              ))}
            </ul>
          ) : <p className="muted x-empty">Nobody big yet.</p>}
        </Widget>
      </div>
    </div>
  );
}
