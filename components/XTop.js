'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Widget from './Widget';
import CoinImg from './CoinImg';
import XImg from './XImg';

const k = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K` : String(n));
const ago = (iso, now) => {
  const s = Math.max(0, Math.round((now - new Date(iso)) / 1000));
  return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`;
};

const LANES = [
  ['all', 'All'],
  ['coin', 'Meme coins'],
  ['meme', 'Memes'],
];

function Move({ rank, was }) {
  if (!was) return <span className="xr-move is-new">New</span>;
  const d = was - rank;
  if (!d) return <span className="xr-move is-same">–</span>;
  return <span className={`xr-move ${d > 0 ? 'is-up' : 'is-down'}`}>{d > 0 ? '▲' : '▼'}{Math.abs(d)}</span>;
}

function Row({ p, now, flash, hidden }) {
  return (
    <li className={flash ? 'xr-flash' : undefined} hidden={hidden}>
      <div className="xr-rank">
        <b>{p.rank}</b>
        <Move rank={p.rank} was={p.was} />
      </div>
      <div className="xr-body">
        <p className="xp-who">
          <XImg src={p.author.avatar} name={p.author.name} size={22} avatar />
          <b>{p.author.name}</b>
          <span>@{p.author.handle} · {k(p.author.followers)}</span>
          <time dateTime={p.createdAt}>{ago(p.createdAt, now)}</time>
        </p>
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="xp-text">{p.text.replace(/\n{2,}/g, '\n')}</a>
        {p.quoted && (
          <div className="xp-quote">
            <p className="xp-who"><b>{p.quoted.name}</b><span>@{p.quoted.handle}</span></p>
            <p>{p.quoted.text}</p>
          </div>
        )}
        {p.img && (
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="xp-img">
            <XImg src={p.img} />
          </a>
        )}
        <div className="xp-foot">
          <span className="xp-coins">
            {p.coins.map((c) => (
              <Link key={c.address} href={`/coin/${c.address}`} className="xp-coin">
                <CoinImg address={c.address} src={c.image} name={c.name} symbol={c.symbol} size={18} />
                {c.symbol}
              </Link>
            ))}
            {p.tags.filter((t) => !p.coins.some((c) => c.symbol.toUpperCase() === t)).map((t) => (
              <span key={t} className="xp-tag">${t}</span>
            ))}
          </span>
          <span className="xp-stats">
            <b>{k(p.likes)}</b> likes · <b>{k(p.reposts)}</b> reposts{p.views ? <> · <b>{k(p.views)}</b> views</> : null}
          </span>
        </div>
      </div>
    </li>
  );
}

// Today's top 25: polls every few seconds, holds still while the pointer is on the list.
export default function XTop({ initial }) {
  const [live, setLive] = useState(initial);
  const [shown, setShown] = useState(initial);
  const [hover, setHover] = useState(false);
  const [lane, setLane] = useState('all');
  const [more, setMore] = useState(false);
  // How many posts fit beside the sidebar, so both columns end on the same line.
  const [fit, setFit] = useState(10);
  const listRef = useRef(null);
  const sideRef = useRef(null);
  const [now, setNow] = useState(() => Date.now());
  const last = useRef(Object.fromEntries((initial.lists?.all || []).map((p) => [p.id, `${p.rank}:${p.likes}`])));
  const [flash, setFlash] = useState(new Set());

  useEffect(() => {
    let stop = false;
    let timer;
    const tick = async () => {
      if (!document.hidden) {
        try {
          const r = await fetch('/api/x/live', { cache: 'no-store' });
          if (r.ok) { const j = await r.json(); if (!stop && j.lists) setLive(j); }
        } catch {}
      }
      if (!stop) timer = setTimeout(tick, 20000);
    };
    timer = setTimeout(tick, 20000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { stop = true; clearTimeout(timer); clearInterval(clock); };
  }, []);

  useEffect(() => {
    if (hover) return;
    // Light up rows that are new or moved since the last update.
    const all = live.lists?.all || [];
    const changed = new Set(all.filter((p) => last.current[p.id]?.split(':')[0] !== String(p.rank)).map((p) => p.id));
    last.current = Object.fromEntries(all.map((p) => [p.id, `${p.rank}:${p.likes}`]));
    setFlash(changed);
    setShown(live);
  }, [live, hover]);

  const waiting = hover && live.at !== shown.at;
  const full = useMemo(() => shown.lists?.[lane] || [], [shown, lane]);
  const FIRST = Math.min(fit, full.length);

  useLayoutEffect(() => {
    const ul = listRef.current;
    const side = sideRef.current;
    if (!ul || !side) return;
    const measure = () => {
      const items = [...ul.children];
      // One column (phones): a fixed first ten.
      if (getComputedStyle(side.parentElement).gridTemplateColumns.split(' ').length < 2) { setFit(10); return; }
      if (more) return;
      const last = side.lastElementChild;
      const sideH = last ? last.getBoundingClientRect().bottom - side.getBoundingClientRect().top : 0;
      const feed = ul.closest('.wg');
      const btn = feed.querySelector('.x-more');
      const above = ul.getBoundingClientRect().top - feed.getBoundingClientRect().top;
      const room = sideH - above - (btn ? btn.offsetHeight : 64);
      const was = items.map((li) => li.hidden);
      items.forEach((li) => { li.hidden = false; });
      const top = ul.getBoundingClientRect().top;
      let n = 0;
      for (const li of items) { if (li.getBoundingClientRect().bottom - top <= room) n++; else break; }
      items.forEach((li, i) => { li.hidden = was[i]; });
      setFit(Math.max(3, n));
    };
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(side);
    ul.querySelectorAll('img').forEach((img) => { if (!img.complete) img.addEventListener('load', measure, { once: true }); });
    return () => ro.disconnect();
  }, [full, more, lane]);
  const accounts = useMemo(() => {
    const m = new Map();
    for (const p of shown.lists?.all || []) if (!m.has(p.author.handle)) m.set(p.author.handle, p.author);
    return [...m.values()].sort((a, b) => b.followers - a.followers).slice(0, 6);
  }, [shown]);

  return (
    <div className="row row-x">
      <Widget id="x-top" title="Top 25" note="last 24 hours" className="wg-xfeed">
        <div className="x-bar">
          <div className="seg seg-sm x-seg" role="tablist">
            {LANES.map(([id, label]) => (
              <button key={id} type="button" role="tab" className="seg-btn" aria-selected={lane === id} onClick={() => { setLane(id); setMore(false); }}>{label}</button>
            ))}
          </div>
          <span className={`x-live${hover ? ' is-paused' : ''}`}>
            <i aria-hidden="true" />
            {hover ? (waiting ? 'Update waiting' : 'Paused') : `Updated ${ago(new Date(shown.at).toISOString(), now)} ago · every 15m`}
          </span>
        </div>
        {full.length ? (
          <ol ref={listRef} className="xr" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            {full.map((p, i) => <Row key={p.id} p={p} now={now} flash={flash.has(p.id)} hidden={!more && i >= FIRST} />)}
          </ol>
        ) : (
          <p className="muted x-empty">Gathering the top posts. They show up here within a couple of minutes.</p>
        )}
        {full.length > FIRST && (
          <div className="x-more">
            {more
              ? <button type="button" className="btn btn-quiet" onClick={() => { setMore(false); document.getElementById('x-top')?.scrollIntoView({ block: 'start' }); }}>Show fewer posts</button>
              : <button type="button" className="btn btn-quiet" onClick={() => setMore(true)}>Show {full.length - FIRST} more posts</button>}
          </div>
        )}
      </Widget>
      <div className="x-side" ref={sideRef}>
        <Widget title="Celebrities on runners" note="last 48h" className="wg-xceleb">
          {shown.celebs?.posts?.length ? (
            <ul className="xc">
              {shown.celebs.posts.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <p className="xp-who">
                    <XImg src={p.author.avatar} name={p.author.name} size={22} avatar />
                    <b>{p.author.name}</b>
                    <span>{k(p.author.followers)}</span>
                    <time dateTime={p.createdAt}>{ago(p.createdAt, now)}</time>
                  </p>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="xc-text">{p.text}</a>
                  <span className="xp-coins">
                    {p.coins.map((c) => (
                      <Link key={c.address} href={`/coin/${c.address}`} className="xp-coin">
                        <CoinImg address={c.address} src={c.image} name={c.name} symbol={c.symbol} size={18} />
                        {c.symbol}
                        {c.h24 != null && <i className={c.h24 >= 0 ? 'up' : 'down'}>{c.h24 >= 0 ? '+' : ''}{Math.round(c.h24)}%</i>}
                      </Link>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="muted x-empty">None of the {shown.celebs?.watching || 'big'} accounts we watch has posted about a running coin in the last 48 hours.{shown.celebs?.at ? ` Checked ${ago(new Date(shown.celebs.at).toISOString(), now)} ago.` : ''}</p>}
        </Widget>
        <Widget title="Coins in the top 25" className="wg-xtalk">
          {shown.named.length ? (
            <ol className="xt">
              {shown.named.map((c, i) => {
                const inner = (
                  <>
                    <span className="xt-rank">{i + 1}</span>
                    {c.coin ? <CoinImg address={c.coin.address} src={c.coin.image} name={c.coin.name} symbol={c.coin.symbol} size={28} /> : <span className="xt-sym" aria-hidden="true">$</span>}
                    <span className="xt-name">${c.sym}<small>{c.coin ? c.coin.name : 'not on today’s board'}</small></span>
                    <b>{c.n}</b>
                  </>
                );
                return <li key={c.sym}>{c.coin ? <Link href={`/coin/${c.coin.address}`}>{inner}</Link> : <a href={`https://x.com/search?q=%24${c.sym}&f=top`} target="_blank" rel="noopener noreferrer">{inner}</a>}</li>;
              })}
            </ol>
          ) : <p className="muted x-empty">No coins named yet today.</p>}
        </Widget>
        <Widget title="Biggest accounts in it" className="wg-xloud">
          {accounts.length ? (
            <ul className="xl">
              {accounts.map((a) => (
                <li key={a.handle}>
                  <a href={`https://x.com/${a.handle}`} target="_blank" rel="noopener noreferrer">
                    <XImg src={a.avatar} name={a.name} size={32} avatar />
                    <span className="xl-name">{a.name}<small>@{a.handle}</small></span>
                    <b>{k(a.followers)}</b>
                  </a>
                </li>
              ))}
            </ul>
          ) : <p className="muted x-empty">Nobody yet.</p>}
        </Widget>
      </div>
    </div>
  );
}
