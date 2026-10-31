'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CoinImg from './CoinImg';
import LiveNumber from './LiveNumber';
import useLive from './useLive';
import { gain } from '@/lib/format';

// "Also running hot": the biggest live 24h gainers after today's #1. It follows the
// leader card, so the #1 never shows up here twice.
export default function RailStories({ coins, count = 4 }) {
  const live = useLive(coins.map((c) => c.address), 5000);
  const [leadAddr, setLeadAddr] = useState(null);
  useEffect(() => {
    if (window.__mtLead) setLeadAddr(window.__mtLead.address);
    const on = (e) => setLeadAddr(e.detail.address);
    window.addEventListener('mt:lead', on);
    return () => window.removeEventListener('mt:lead', on);
  }, []);
  const list = coins
    .map((c) => ({ ...c, h24: live[c.address]?.change?.h24 ?? c.h24 }))
    .filter((c) => c.address !== leadAddr && typeof c.h24 === 'number')
    .sort((a, b) => b.h24 - a.h24)
    .slice(0, count);
  return (
    <ol className="fp-stories">
      {list.map((r) => (
        <li key={r.address}>
          <Link href={`/coin/${r.address}`}>
            <span className="fp-story-top">
              <CoinImg address={r.address} src={r.image} name={r.name} symbol={r.symbol} size={28} />
              <b>{r.name}</b>
              <LiveNumber value={r.h24} format={gain} className={r.h24 >= 0 ? 'up' : 'down'} />
            </span>
            {r.why && <span className="fp-story-why">{r.why}</span>}
          </Link>
        </li>
      ))}
    </ol>
  );
}
