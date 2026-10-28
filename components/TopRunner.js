'use client';

import CoinImg from './CoinImg';
import LiveNumber from './LiveNumber';
import TypeBadge from './TypeBadge';
import useLive from './useLive';
import { Out, XLogo } from './Icons';
import { usd, pct, age } from '@/lib/format';
import { typeById } from '@/lib/types';

function price(n) {
  if (n == null) return '–';
  if (n >= 1) return `$${n.toFixed(2)}`;
  const digits = Math.max(2, -Math.floor(Math.log10(n)) + 2);
  return `$${n.toFixed(Math.min(digits, 10))}`;
}

function Chart({ points, up }) {
  if (!points || points.length < 3) return null;
  const W = 600, H = 150, pad = 6;
  const cs = points.map((p) => p.c);
  const min = Math.min(...cs), max = Math.max(...cs);
  const x = (i) => (i / (points.length - 1)) * W;
  const y = (c) => pad + (1 - (c - min) / (max - min || 1)) * (H - pad * 2);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join('');
  const last = points[points.length - 1];
  return (
    <figure className="top-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Price over the last 24 hours">
        <defs>
          <linearGradient id="tc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={up ? 'var(--up)' : 'var(--down)'} stopOpacity=".22" />
            <stop offset="1" stopColor={up ? 'var(--up)' : 'var(--down)'} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line}L${W},${H}L0,${H}Z`} fill="url(#tc-fill)" />
        <path d={line} fill="none" stroke={up ? 'var(--up)' : 'var(--down)'} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
        <circle cx={x(points.length - 1)} cy={y(last.c)} r="4" fill={up ? 'var(--up)' : 'var(--down)'} />
      </svg>
      <figcaption className="small muted">Last 24 hours, 15-minute steps</figcaption>
    </figure>
  );
}

export default function TopRunner({ top, others, chart }) {
  const live = useLive([top.address, ...others.map((o) => o.address)]);
  const L = live[top.address];
  const h24 = L?.change?.h24 ?? top.change.h24;
  const cap = L?.marketCap ?? top.marketCap;
  const px = L?.priceUsd ?? top.priceUsd;
  const h1 = L?.change?.h1 ?? top.change.h1;

  return (
    <div className="toprun">
      <div className="top-main">
        <div className="top-id">
          <a href={top.url} target="_blank" rel="noopener noreferrer" className="top-logo">
            <CoinImg src={top.image} name={top.name} symbol={top.symbol} size={88} />
          </a>
          <div>
            <h1 className="top-title">
              <span className="top-name">{top.name}</span> is running hardest today
            </h1>
            <p className="top-sub">
              <span className="muted">${top.symbol}</span>
              <TypeBadge id={top.type} />
              <span className="muted">{typeById(top.type).name}</span>
              <span className="muted">{age(top.ageHours)} old</span>
            </p>
          </div>
        </div>

        <div className="top-big">
          <LiveNumber value={h24} format={(v) => pct(v)} className={`top-pct num ${h24 >= 0 ? 'up' : 'down'}`} />
          <span className="top-pct-label">in 24 hours</span>
        </div>

        <dl className="top-stats">
          <div><dt>Market cap</dt><dd><LiveNumber value={cap} format={usd} className="num" /></dd></div>
          <div><dt>Price</dt><dd><LiveNumber value={px} format={price} className="num" /></dd></div>
          <div><dt>Last hour</dt><dd><LiveNumber value={h1} format={(v) => pct(v)} className={`num ${h1 >= 0 ? 'up' : 'down'}`} /></dd></div>
          <div><dt>Volume 24h</dt><dd className="num">{usd(top.volume24h)}</dd></div>
          {top.top10 != null && <div><dt>Top 10 hold</dt><dd className="num">{Math.round(top.top10 * 100)}%</dd></div>}
        </dl>

        <div className="top-links">
          <a className="btn btn-ink btn-sm" href={top.url} target="_blank" rel="noopener noreferrer">Open chart <Out width={16} height={16} /></a>
          <a className="btn btn-quiet btn-sm" href={`https://gmgn.ai/sol/token/${top.address}`} target="_blank" rel="noopener noreferrer">GMGN</a>
          {top.socials.x && <a className="btn btn-quiet btn-sm" href={top.socials.x} target="_blank" rel="noopener noreferrer nofollow" aria-label={`${top.name} on X`}><XLogo /></a>}
          <span className="live-note"><span className="live-dot" aria-hidden="true" /> Live, updates every 15 seconds</span>
        </div>
      </div>

      <div className="top-side">
        <Chart points={chart} up={h24 >= 0} />
        {others.length > 0 && (
          <div className="also">
            <h2 className="also-title">Also running today</h2>
            <ol>
              {others.map((o) => {
                const v = live[o.address]?.change?.h24 ?? o.change.h24;
                return (
                  <li key={o.address}>
                    <a href={o.url} target="_blank" rel="noopener noreferrer">
                      <CoinImg src={o.image} name={o.name} symbol={o.symbol} size={30} />
                      <span className="also-name">{o.name}</span>
                      <TypeBadge id={o.type} />
                      <LiveNumber value={v} format={(x) => pct(x)} className={`num also-pct ${v >= 0 ? 'up' : 'down'}`} />
                    </a>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
