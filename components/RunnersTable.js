'use client';

import { useMemo, useRef, useState } from 'react';

const FIRST = 20;
import Link from 'next/link';
import CoinImg from './CoinImg';
import LiveNumber from './LiveNumber';
import useLive from './useLive';
import TypeBadge from './TypeBadge';
import { Sort, Out, XLogo } from './Icons';
import { usd, gain, age } from '@/lib/format';

const COLS = [
  { key: 'marketCap', label: 'Market cap', get: (r) => r.marketCap },
  { key: 'h24', label: '24h', get: (r) => r.change.h24 ?? -Infinity },
  { key: 'age', label: 'Age', get: (r) => r.ageHours ?? Infinity, firstDir: 'asc', hideSm: true },
  { key: 'volume', label: 'Volume 24h', get: (r) => r.volume24h, hideSm: true },
  { key: 'top10', label: 'Top 10', get: (r) => r.top10 ?? Infinity, firstDir: 'asc', hideSm: true, title: 'Share of supply held by the 10 biggest wallets, pool excluded' },
];

export default function RunnersTable({ runners: base, themes }) {
  // Live market cap, 24h move and volume for every row (sorting follows the live numbers).
  const live = useLive(base.map((r) => r.address), 5000);
  const runners = useMemo(
    () => base.map((r) => {
      const L = live[r.address];
      return L ? { ...r, marketCap: L.marketCap ?? r.marketCap, volume24h: L.volume?.h24 ?? r.volume24h, change: { ...r.change, h24: L.change?.h24 ?? r.change.h24 } } : r;
    }),
    [base, live],
  );
  const [theme, setTheme] = useState('all');
  const [sort, setSort] = useState({ key: 'marketCap', dir: 'desc' });
  const [all, setAll] = useState(false);
  const top = useRef(null);
  const showLess = () => {
    setAll(false);
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const themeMap = useMemo(() => new Map(themes.map((t) => [t.id, t])), [themes]);

  const cols = useMemo(() => (runners.some((r) => r.top10 != null) ? COLS : COLS.filter((c) => c.key !== 'top10')), [runners]);
  const rows = useMemo(() => {
    const col = COLS.find((c) => c.key === sort.key);
    const list = runners.filter((r) => theme === 'all' || r.theme === theme);
    return [...list].sort((a, b) => (col.get(a) - col.get(b)) * (sort.dir === 'asc' ? 1 : -1));
  }, [runners, theme, sort]);

  const toggle = (c) =>
    setSort((s) => (s.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: c.firstDir || 'desc' }));

  return (
    <div ref={top} style={{ scrollMarginTop: 80 }}>
      <div className="chips chips-scroll" role="group" aria-label="Filter by theme">
        <button type="button" className="chip" aria-pressed={theme === 'all'} onClick={() => setTheme('all')}>
          All <span className="num">{runners.length}</span>
        </button>
        {themes.map((t) => (
          <button key={t.id} type="button" className="chip" style={{ '--c': t.color }} aria-pressed={theme === t.id} onClick={() => setTheme(t.id)}>
            <span className="sw" aria-hidden="true" />
            {t.name} <span className="num">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="table-scroll">
        <table className="runners">
          <thead>
            <tr>
              <th scope="col" className="c-rank">#</th>
              <th scope="col">Coin</th>
              {cols.map((c) => (
                <th key={c.key} scope="col" className={`c-num ${c.hideSm ? 'hide-sm' : ''}`} aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => toggle(c)} title={c.title}>
                    {c.label} <Sort dir={sort.key === c.key ? sort.dir : null} />
                  </button>
                </th>
              ))}
              <th scope="col" className="c-links hide-sm"><span className="sr-only">Links</span></th>
            </tr>
          </thead>
          <tbody>
            {(all ? rows : rows.slice(0, FIRST)).map((r) => {
              const t = themeMap.get(r.theme);
              return (
                <tr key={r.address} style={{ '--c': t?.color }}>
                  <td className="c-rank num muted">{r.rank}</td>
                  <td>
                    <Link className="coin-cell" href={`/coin/${r.address}`}>
                      <CoinImg src={r.image} name={r.name} symbol={r.symbol} color={t?.color} size={34} />
                      <span>
                        <strong>{r.name}</strong>
                        <span className="sub"><TypeBadge id={r.type} /><span className="muted">${r.symbol}</span><span className="age-sm muted num">{age(r.ageHours)} old</span></span>
                      </span>
                    </Link>
                  </td>
                  <td className="c-num num"><LiveNumber value={r.marketCap} format={usd} /></td>
                  <td className={`c-num num ${r.change.h24 >= 0 ? 'up' : 'down'}`}><LiveNumber value={r.change.h24} format={gain} /></td>
                  <td className="c-num num hide-sm">{age(r.ageHours)}</td>
                  <td className="c-num num hide-sm">{usd(r.volume24h)}</td>
                  {cols.length > COLS.length - 1 && <td className="c-num num hide-sm">{r.top10 == null ? '–' : `${Math.round(r.top10 * 100)}%`}</td>}
                  <td className="c-links hide-sm">
                    <span className="links">
                      {r.socials.x ? <a href={r.socials.x} target="_blank" rel="noopener noreferrer nofollow" aria-label={`${r.name} on X`}><XLogo /></a> : <span className="links-gap" aria-hidden="true" />}
                      <a href={`https://gmgn.ai/sol/token/${r.address}`} target="_blank" rel="noopener noreferrer" aria-label={`${r.name} on GMGN`}>GMGN</a>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" aria-label={`${r.name} on DexScreener`}><Out /></a>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length > FIRST && (
          <div className="table-more">
            {all
              ? <button type="button" className="btn btn-quiet" onClick={showLess}>Show less</button>
              : <button type="button" className="btn btn-quiet" onClick={() => setAll(true)}>Show all {rows.length}</button>}
          </div>
        )}
      </div>
    </div>
  );
}
