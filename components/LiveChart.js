'use client';

import { useState } from 'react';
import CoinChart from './CoinChart';

// The live trading chart (DexScreener's embed, updates with every trade),
// with our simple 24h/7d line as the other view.
export default function LiveChart({ pairAddress, day, week }) {
  const [view, setView] = useState(pairAddress ? 'live' : 'simple');
  const src = `https://dexscreener.com/solana/${pairAddress}?embed=1&loadChartSettings=0&trades=0&tabs=0&info=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=1&chartType=usd&interval=15`;
  return (
    <section className="lch" aria-label="Price chart">
      {pairAddress && (
        <div className="seg seg-sm" role="tablist" aria-label="Chart view">
          <button type="button" role="tab" className="seg-btn" aria-selected={view === 'live'} onClick={() => setView('live')}>Live chart</button>
          <button type="button" role="tab" className="seg-btn" aria-selected={view === 'simple'} onClick={() => setView('simple')}>Simple</button>
        </div>
      )}
      {view === 'live' ? (
        <div className="lch-frame">
          <iframe src={src} title="Live price chart from DexScreener" loading="lazy" referrerPolicy="no-referrer" allow="clipboard-write" />
        </div>
      ) : (
        <CoinChart day={day} week={week} />
      )}
    </section>
  );
}
