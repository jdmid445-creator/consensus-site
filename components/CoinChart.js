'use client';

import { useState } from 'react';

function path(points, W, H, pad) {
  const cs = points.map((p) => p.c);
  const min = Math.min(...cs), max = Math.max(...cs);
  const x = (i) => (i / (points.length - 1)) * W;
  const y = (c) => pad + (1 - (c - min) / (max - min || 1)) * (H - pad * 2);
  return points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.c).toFixed(1)}`).join('');
}

// Price chart with a 24h / 7d switch. Draws itself in when it loads or changes range.
export default function CoinChart({ day, week }) {
  const ranges = [
    { id: 'day', label: '24h', points: day, cap: '15-minute steps' },
    { id: 'week', label: '7d', points: week, cap: '4-hour steps' },
  ].filter((r) => r.points && r.points.length > 2);
  const [id, setId] = useState(ranges[0]?.id);
  const cur = ranges.find((r) => r.id === id) || ranges[0];
  if (!cur) return <p className="note">No price history yet.</p>;
  const W = 560, H = 200, pad = 10;
  const d = path(cur.points, W, H, pad);
  const up = cur.points[cur.points.length - 1].c >= cur.points[0].c;
  const color = up ? 'var(--up)' : 'var(--down)';
  const change = ((cur.points[cur.points.length - 1].c - cur.points[0].c) / cur.points[0].c) * 100;
  return (
    <figure className="cc">
      <div className="cc-top">
        {ranges.length > 1 && (
          <div className="seg seg-sm" role="tablist" aria-label="Chart range">
            {ranges.map((r) => (
              <button key={r.id} type="button" role="tab" aria-selected={r.id === cur.id} className="seg-btn" onClick={() => setId(r.id)}>{r.label}</button>
            ))}
          </div>
        )}
        <span className={`cc-change ${up ? 'up' : 'down'}`}>{change >= 0 ? '+' : ''}{Math.abs(change) >= 1000 ? `${Math.round(change).toLocaleString('en-US')}` : change.toFixed(1)}% over {cur.label}</span>
      </div>
      <svg key={cur.id} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Price over ${cur.label}`}>
        <defs>
          <linearGradient id="cc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity=".14" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="lc-area" d={`${d}L${W},${H}L0,${H}Z`} fill="url(#cc-fill)" />
        <path className="lc-line" d={d} pathLength="1" fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption>Price, {cur.cap}</figcaption>
    </figure>
  );
}
