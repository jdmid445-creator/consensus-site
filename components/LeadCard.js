'use client';

import Link from 'next/link';
import CoinImg from './CoinImg';
import LiveNumber from './LiveNumber';
import TypeBadge from './TypeBadge';
import useLive from './useLive';
import { Out, XLogo } from './Icons';
import { usd, pct, gain, age } from '@/lib/format';
import { typeById } from '@/lib/types';

function Spark({ points, up }) {
  if (!points || points.length < 3) return null;
  const W = 480, H = 132, pad = 8;
  const cs = points.map((p) => p.c);
  const min = Math.min(...cs), max = Math.max(...cs);
  const x = (i) => (i / (points.length - 1)) * W;
  const y = (c) => pad + (1 - (c - min) / (max - min || 1)) * (H - pad * 2);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join('');
  const color = up ? 'var(--up)' : 'var(--down)';
  return (
    <figure className="lc-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Price over the last 24 hours">
        <defs>
          <linearGradient id="lc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".14" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="lc-area" d={`${line}L${W},${H}L0,${H}Z`} fill="url(#lc-fill)" />
        <path className="lc-line" d={line} pathLength="1" fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption>Last 24 hours</figcaption>
    </figure>
  );
}

// "Leading today": the coin with the biggest 24h gain that has real trading behind it, live.
export default function LeadCard({ lead, next, chart }) {
  const live = useLive([lead.address, ...next.map((n) => n.address)], 5000);
  const L = live[lead.address];
  const v = L?.change?.h24 ?? lead.change.h24;
  const h1 = L?.change?.h1 ?? lead.change.h1;
  const cap = L?.marketCap ?? lead.marketCap;

  return (
    <aside className="lc" aria-labelledby="lc-title">
      <h2 id="lc-title" className="sr-only">Leading today</h2>
      <Link className="lc-coin" href={`/coin/${lead.address}`}>
        <CoinImg src={lead.image} name={lead.name} symbol={lead.symbol} size={52} />
        <span className="lc-id">
          <strong>{lead.name}</strong>
          <span className="lc-meta">
            <span>${lead.symbol}</span>
            <TypeBadge id={lead.type} />
            <span>{typeById(lead.type).name}</span>
          </span>
        </span>
        <span className="lc-gain">
          <LiveNumber value={v} format={gain} className={v >= 0 ? 'up' : 'down'} />
          <span className="lc-gain-cap">Leads today</span>
        </span>
      </Link>
      {lead.why && <p className="lc-why">{lead.why}</p>}

      <Spark points={chart} up={v >= 0} />

      <dl className="lc-rows">
        <div><dt>Market cap</dt><dd><LiveNumber value={cap} format={usd} /></dd></div>
        <div><dt>Last hour</dt><dd><LiveNumber value={h1} format={pct} className={h1 >= 0 ? 'up' : 'down'} /></dd></div>
        <div><dt>Volume, 24h</dt><dd>{usd(lead.volume24h)}</dd></div>
        <div><dt>Age</dt><dd>{age(lead.ageHours)}</dd></div>
        {lead.top10 != null && <div><dt>Top 10 wallets</dt><dd>{Math.round(lead.top10 * 100)}%</dd></div>}
      </dl>

      <div className="lc-actions">
        <Link className="btn btn-ink btn-sm" href={`/coin/${lead.address}`}>Read the story</Link>
        <a className="btn btn-quiet btn-sm" href={lead.url} target="_blank" rel="noopener noreferrer">Chart <Out width={15} height={15} /></a>
        {lead.socials.x && <a className="btn btn-quiet btn-sm btn-icon" href={lead.socials.x} target="_blank" rel="noopener noreferrer nofollow" aria-label={`${lead.name} on X`}><XLogo /></a>}
      </div>

      {next.length > 0 && (
        <ol className="lc-next" start={2} aria-label="Next behind it">
          {next.map((n) => {
            const nv = live[n.address]?.change?.h24 ?? n.change.h24;
            return (
              <li key={n.address}>
                <Link href={`/coin/${n.address}`}>
                  <CoinImg src={n.image} name={n.name} symbol={n.symbol} size={22} />
                  <span className="lc-next-name">{n.name}</span>
                  <LiveNumber value={nv} format={gain} className={nv >= 0 ? 'up' : 'down'} />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
