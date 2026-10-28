'use client';

import { useEffect, useRef, useState } from 'react';

// Polls /api/live every `ms` for the given token addresses while the tab is visible.
// Returns { [address]: { priceUsd, marketCap, change } } (empty until the first answer).
export default function useLive(addresses, ms = 15000) {
  const [data, setData] = useState({});
  const key = addresses.filter(Boolean).slice(0, 30).join(',');
  const timer = useRef(null);

  useEffect(() => {
    if (!key) return;
    let stop = false;
    async function tick() {
      if (document.visibilityState === 'visible') {
        try {
          const res = await fetch(`/api/live?a=${key}`, { cache: 'no-store' });
          if (res.ok && !stop) setData(await res.json());
        } catch {}
      }
      if (!stop) timer.current = setTimeout(tick, ms);
    }
    tick();
    const onVis = () => { if (document.visibilityState === 'visible') { clearTimeout(timer.current); tick(); } };
    document.addEventListener('visibilitychange', onVis);
    return () => { stop = true; clearTimeout(timer.current); document.removeEventListener('visibilitychange', onVis); };
  }, [key, ms]);

  return data;
}
