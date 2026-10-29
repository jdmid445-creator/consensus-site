'use client';

import { useState } from 'react';
import Link from 'next/link';
import CoinImg from './CoinImg';

const k = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));
const ago = (iso) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  return m < 1 ? 'now' : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};

const FILTERS = [
  ['all', 'All'],
  ['runners', 'Runners'],
  ['big', 'Big accounts'],
  ['hot', 'Most liked'],
];

// The post list, with a filter for bigger accounts and a most-liked sort.
export default function XFeed({ posts, watch = [] }) {
  const [f, setF] = useState('all');
  const merged = [...posts, ...watch].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  let list = merged;
  if (f === 'runners') list = posts;
  if (f === 'big') list = watch;
  if (f === 'hot') list = [...merged].sort((a, b) => b.likes + b.reposts * 2 - (a.likes + a.reposts * 2));
  return (
    <>
      <div className="seg seg-sm x-seg" role="tablist">
        {FILTERS.map(([id, label]) => (
          <button key={id} type="button" role="tab" className="seg-btn" aria-selected={f === id} onClick={() => setF(id)}>{label}</button>
        ))}
      </div>
      {list.length ? (
        <ul className="xp">
          {list.slice(0, 40).map((p) => (
            <li key={p.id}>
              <a href={`https://x.com/${p.author.handle}`} target="_blank" rel="noopener noreferrer" className="xp-av">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.author.avatar} alt="" width={40} height={40} loading="lazy" />
              </a>
              <div className="xp-body">
                <p className="xp-who">
                  <b>{p.author.name}</b>
                  <span>@{p.author.handle} · {k(p.author.followers)} followers · {ago(p.createdAt)}</span>
                </p>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="xp-text">{p.text.replace(/\n{2,}/g, "\n")}</a>
                <div className="xp-foot">
                  <span className="xp-coins">
                    {p.big && <span className="xp-big">Big account</span>}
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
          ))}
        </ul>
      ) : (
        <p className="muted x-empty">Nothing here yet. The feed checks again every few minutes.</p>
      )}
    </>
  );
}
