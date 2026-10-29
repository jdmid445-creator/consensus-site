'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import CoinImg from './CoinImg';
import { Search as SearchIcon } from './Icons';
import { gain } from '@/lib/format';

const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// Find a coin: type a name or ticker to search today's runners, or paste any contract address.
export default function Search() {
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const router = useRouter();
  const box = useRef(null);

  const load = () => {
    if (list) return;
    fetch('/api/meta').then((r) => r.json()).then((d) => setList(d.runners || [])).catch(() => setList([]));
  };

  useEffect(() => {
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const key = (e) => {
      if (e.key === '/' && !/input|textarea/i.test(document.activeElement?.tagName || '')) { e.preventDefault(); box.current?.querySelector('input')?.focus(); }
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', key); };
  }, []);

  const t = q.trim();
  const hits = useMemo(() => {
    if (!t || !list) return [];
    const s = t.toLowerCase().replace(/^\$/, '');
    return list.filter((r) => r.name.toLowerCase().includes(s) || r.symbol.toLowerCase().includes(s) || r.address === t).slice(0, 6);
  }, [t, list]);
  const isMint = MINT.test(t) && !hits.some((h) => h.address === t);
  const options = [...hits.map((h) => `/coin/${h.address}`), ...(isMint ? [`/coin/${t}`] : [])];

  const go = (href) => { setOpen(false); setQ(''); router.push(href); };

  return (
    <div className="search" ref={box}>
      <SearchIcon width={17} height={17} />
      <input
        type="search"
        value={q}
        placeholder="Search a coin or paste a CA"
        aria-label="Search a coin or paste a contract address"
        onFocus={() => { load(); setOpen(true); }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setI(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setI((n) => Math.min(n + 1, options.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setI((n) => Math.max(n - 1, 0)); }
          if (e.key === 'Enter' && options[i]) go(options[i]);
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      <kbd className="search-kbd" aria-hidden="true">/</kbd>
      {open && t && (
        <div className="search-pop" role="listbox">
          {hits.map((r, k) => (
            <button key={r.address} type="button" role="option" aria-selected={i === k} className="search-hit" onMouseEnter={() => setI(k)} onClick={() => go(`/coin/${r.address}`)}>
              <CoinImg address={r.address} src={r.image} name={r.name} symbol={r.symbol} size={26} />
              <span><b>{r.name}</b> <span className="muted">${r.symbol}</span></span>
              <span className={r.change.h24 >= 0 ? 'up' : 'down'}>{gain(r.change.h24)}</span>
            </button>
          ))}
          {isMint && (
            <button type="button" role="option" aria-selected={i === hits.length} className="search-hit" onClick={() => go(`/coin/${t}`)}>
              <span className="search-ca">CA</span>
              <span>Open <b>{t.slice(0, 4)}…{t.slice(-4)}</b></span>
              <span />
            </button>
          )}
          {!hits.length && !isMint && <p className="search-none">{list ? 'No runner by that name today. Paste a contract address to open any coin.' : 'Loading…'}</p>}
        </div>
      )}
    </div>
  );
}
