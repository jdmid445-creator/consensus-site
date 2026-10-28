'use client';

import { useEffect, useState } from 'react';

const pc = (x, digits = 1) => (x == null ? '–' : x === 0 ? '0%' : x < 0.001 ? '<0.1%' : `${(x * 100).toFixed(x < 0.1 ? digits : 0)}%`);
const short = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '');

function Row({ label, value, sub, tone, help }) {
  return (
    <div className="hs-row" title={help}>
      <dt>{label}</dt>
      <dd>
        <span className={tone || ''}>{value}</span>
        {sub && <small>{sub}</small>}
      </dd>
    </div>
  );
}

// Holders, whales, dev and bundles for one coin, read from Solana through Helius.
export default function HolderStats({ address }) {
  const [s, setS] = useState({ status: 'loading' });
  useEffect(() => {
    let stop = false;
    fetch(`/api/onchain?a=${address}`)
      .then(async (res) => {
        const d = await res.json();
        if (!stop) setS(res.ok && !d.error ? { status: 'done', d } : { status: 'error', error: d.error });
      })
      .catch(() => !stop && setS({ status: 'error', error: 'Couldn’t load holder stats.' }));
    return () => { stop = true; };
  }, [address]);

  if (s.status === 'loading') {
    return (
      <section className="hs" aria-busy="true">
        <h2 className="h3">Holders and launch</h2>
        <p className="note">Reading the holders and the first trades from Solana…</p>
        <div className="cs-skel"><span /><span /><span /><span /></div>
      </section>
    );
  }
  if (s.status === 'error') {
    return (
      <section className="hs">
        <h2 className="h3">Holders and launch</h2>
        <p className="note">{s.error}</p>
      </section>
    );
  }
  const d = s.d;
  const warn = (x, hi) => (x != null && x >= hi ? 'down' : '');
  return (
    <section className="hs">
      <h2 className="h3">Holders and launch</h2>
      <dl>
        <Row label="Holders" value={d.holders == null ? '–' : `${d.holders.toLocaleString('en-US')}${d.holdersCapped ? '+' : ''}`} help="Wallets holding any of this coin." />
        <Row label="Top 10 wallets" value={pc(d.top10)} tone={warn(d.top10, 0.35)} help="Share of supply held by the 10 biggest wallets, not counting the liquidity pool." />
        <Row label="Biggest wallet" value={pc(d.topHolder)} tone={warn(d.topHolder, 0.08)} help="Share held by the single biggest wallet, pool excluded." />
        <Row label="Whales" value={d.whales == null ? '–' : `${d.whales}${d.whalesCapped ? '+' : ''}`} sub="wallets with 1%+" help="Wallets holding at least 1% of supply, pool excluded." />
        {d.dev ? (
          <Row
            label="Dev wallet"
            value={d.dev.holds == null ? '–' : d.dev.holds === 0 ? 'Sold out' : `Holds ${pc(d.dev.holds)}`}
            tone={d.dev.holds === 0 ? '' : warn(d.dev.holds, 0.05)}
            sub={`${short(d.dev.wallet)}, bought ${pc(d.dev.bought)} at launch`}
            help="The wallet that created the coin: what it got at launch and what it holds now."
          />
        ) : null}
        {d.bundle ? (
          <Row
            label="Bundles"
            value={d.bundle.wallets ? `Hold ${pc(d.bundle.holds)}` : 'None found'}
            tone={warn(d.bundle.holds, 0.1)}
            sub={d.bundle.wallets ? `${d.bundle.wallets} ${d.bundle.wallets === 1 ? 'wallet' : 'wallets'} bought ${pc(d.bundle.bought)} in the launch block` : 'No other wallet bought in the launch block'}
            help="Wallets other than the dev that bought in the same block the coin was created: the classic bundle."
          />
        ) : null}
        {d.early ? (
          <Row
            label="Early buyers"
            value={d.early.wallets ? `Hold ${pc(d.early.holds)}` : 'None'}
            sub={d.early.wallets ? `${d.early.wallets} ${d.early.wallets === 1 ? 'wallet' : 'wallets'} bought ${pc(d.early.bought)} in the next 5 blocks` : ''}
            help="Wallets that bought within the five blocks after launch (about two seconds)."
          />
        ) : null}
      </dl>
      {d.launchNote && <p className="note">{d.launchNote}</p>}
      <p className="note">Read from Solana through Helius, refreshed every 30 minutes. Pool excluded from all holder shares.</p>
    </section>
  );
}
