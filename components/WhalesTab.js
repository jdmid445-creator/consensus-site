'use client';

import { useEffect, useMemo, useState } from 'react';
import useLive from './useLive';
import { usd } from '@/lib/format';
import { XLogo } from './Icons';

const short = (a) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const pc = (x) => (x == null ? '–' : x < 0.001 ? '<0.1%' : `${(x * 100).toFixed(x < 0.1 ? 2 : 1)}%`);
const money = (x) => {
  if (x == null) return '–';
  const s = usd(Math.abs(x));
  return x > 0 ? `+${s}` : x < 0 ? `-${s}` : s;
};
const tokens = (n) => (n == null ? '' : n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : `${Math.round(n)}`);
const tone = (x) => (x == null || x === 0 ? '' : x > 0 ? 'up' : 'down');
const held = (secs) => {
  if (secs == null) return null;
  const h = secs / 3600;
  return h < 1 ? `${Math.max(1, Math.round(secs / 60))}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`;
};
const TAG = { dev: 'Dev', bundle: 'Bundle', early: 'Early buyer' };
const SORTS = [
  ['share', 'Biggest bag'],
  ['coin', 'Best on this coin'],
  ['life', 'Best lifetime'],
];

// The biggest wallets in a coin: what they hold, what they've made on it, and what they've
// made across everything they trade. Loads when the tab opens, then every 30 seconds.
export default function WhalesTab({ address, active }) {
  const [s, setS] = useState({ status: 'loading' });
  const [sort, setSort] = useState('share');
  const [only, setOnly] = useState(false);
  const live = useLive(active ? [address] : [], 5000);
  const price = live[address]?.priceUsd ?? null;

  useEffect(() => {
    if (!active) return;
    let stop = false;
    const load = () => {
      if (document.visibilityState !== 'visible') return;
      fetch(`/api/whales?a=${address}`, { cache: 'no-store' })
        .then(async (res) => {
          const d = await res.json().catch(() => ({}));
          if (stop) return;
          if (res.ok && !d.error) setS({ status: 'done', d });
          else setS((prev) => (prev.status === 'done' ? prev : { status: 'error', error: d.error || 'Couldn’t load the wallets.' }));
        })
        .catch(() => !stop && setS((prev) => (prev.status === 'done' ? prev : { status: 'error', error: 'Couldn’t load the wallets.' })));
    };
    load();
    const t = setInterval(load, 30000);
    return () => { stop = true; clearInterval(t); };
  }, [address, active]);

  const rows = useMemo(() => {
    if (s.status !== 'done') return [];
    let list = s.d.wallets.map((w) => ({ ...w, value: price != null ? w.amount * price : null }));
    if (only) list = list.filter((w) => (w.share || 0) >= 0.01);
    const key = { share: (w) => w.share ?? -1, coin: (w) => w.coin?.total ?? -Infinity, life: (w) => w.lifetime?.total ?? -Infinity }[sort];
    return [...list].sort((a, b) => key(b) - key(a));
  }, [s, price, sort, only]);

  if (s.status === 'loading') {
    return (
      <div className="wh" aria-busy="true">
        <p className="note">Finding the biggest wallets in this coin…</p>
        <div className="cs-skel"><span /><span /><span /><span /></div>
      </div>
    );
  }
  if (s.status === 'error') return <p className="note">{s.error}</p>;

  const d = s.d;
  const withPnl = d.wallets.filter((w) => w.coin?.total != null);
  const inProfit = withPnl.filter((w) => w.coin.total > 0).length;
  const smart = d.wallets.filter((w) => (w.lifetime?.total ?? 0) >= 100000).length;
  const named = d.wallets.filter((w) => w.identity?.name).length;
  const pnlOn = d.pnl === 'ok';

  return (
    <div className="wh">
      <dl className="wh-sum">
        <div><dt>Whales (1%+)</dt><dd>{d.whales ?? '–'}</dd></div>
        <div><dt>Top 20 hold</dt><dd>{pc(d.wallets.reduce((t, w) => t + (w.share || 0), 0))}</dd></div>
        {pnlOn && <div><dt>In profit here</dt><dd>{withPnl.length ? `${inProfit} of ${withPnl.length}` : '–'}</dd></div>}
        {pnlOn && <div><dt>$100K+ lifetime</dt><dd>{smart}</dd></div>}
        {pnlOn && named > 0 && <div><dt>Known wallets</dt><dd>{named}</dd></div>}
      </dl>

      {pnlOn && (
        <section className="wh-smart">
          <header>
            <h3>Top traders in this coin</h3>
            <span className="note">{d.topCount ? `Out of Solana's ${d.topCount} most profitable traders` : 'Solana\u2019s most profitable traders'}</span>
          </header>
          {d.smart?.length ? (
            <ul>
              {d.smart.slice(0, 12).map((t) => (
                <li key={t.wallet}>
                  <a href={`https://solscan.io/account/${t.wallet}#portfolio`} target="_blank" rel="noopener noreferrer">
                    <span className="wh-rankpill">#{t.rank}</span>
                    <span className="wh-smart-id"><b>{t.name || short(t.wallet)}</b><small>{t.realized != null ? `${money(t.realized)} realized` : short(t.wallet)}</small></span>
                    <span className="wh-smart-num"><b>{pc(t.share)}</b><small className={tone(t.coin?.total)}>{t.coin?.total != null ? `${money(t.coin.total)} here` : ''}</small></span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="note">{d.smart ? 'None of them hold this coin right now.' : 'Couldn\u2019t check the top traders just now.'}</p>
          )}
        </section>
      )}

      <div className="wh-bar">
        <div className="seg seg-sm" role="tablist" aria-label="Sort wallets">
          {SORTS.map(([id, label]) => (
            <button key={id} type="button" role="tab" className="seg-btn" aria-selected={sort === id} disabled={id !== 'share' && !pnlOn} onClick={() => setSort(id)}>{label}</button>
          ))}
        </div>
        <label className="wh-only"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Only 1%+ wallets</label>
      </div>

      <div className="table-scroll">
        <table className="wh-table">
          <thead>
            <tr>
              <th scope="col">Wallet</th>
              <th scope="col" className="c-num">Holds</th>
              <th scope="col" className="c-num">PnL on this coin</th>
              <th scope="col" className="c-num hide-sm">Bought / sold</th>
              <th scope="col" className="c-num">Lifetime PnL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w, i) => (
              <tr key={w.owner} className={(w.share || 0) >= 0.01 ? 'is-whale' : ''}>
                <td>
                  <div className="wh-who">
                    <span className="wh-rank num">{i + 1}</span>
                    <span>
                      <a href={`https://solscan.io/account/${w.owner}#portfolio`} target="_blank" rel="noopener noreferrer" className="wh-name" title="Open this wallet's holdings on Solscan">
                        {w.identity?.name || short(w.owner)}
                      </a>
                      <span className="wh-tags">
                        {w.identity?.name && <span className="muted">{short(w.owner)}</span>}
                        <a href={`https://gmgn.ai/sol/address/${w.owner}`} target="_blank" rel="noopener noreferrer" className="wh-ext">GMGN</a>
                        {w.identity?.twitter && <a href={`https://x.com/${w.identity.twitter.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer nofollow" aria-label="On X"><XLogo width={12} height={12} /></a>}
                        {w.identity?.type && w.identity.type !== 'sns' && <span className="wh-tag">{w.identity.type === 'kol' ? 'KOL' : w.identity.type}</span>}
                        {w.topRank && <span className="wh-tag wh-top">Top trader #{w.topRank}</span>}
                        {w.tags.map((t) => <span key={t} className={`wh-tag wh-${t}`}>{TAG[t]}</span>)}
                        {w.holdSecs != null && <span className="muted">in {held(w.holdSecs)}</span>}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="c-num" data-label="Holds">
                  <b>{pc(w.share)}</b>
                  <small>{tokens(w.amount)}{w.value != null ? ` · ${usd(w.value)}` : ''}</small>
                </td>
                <td className="c-num" data-label="On this coin">
                  <b className={tone(w.coin?.total)}>{money(w.coin?.total)}</b>
                  {w.coin?.total != null && <small>{w.coin.realized != null ? `${money(w.coin.realized)} taken` : ''}</small>}
                </td>
                <td className="c-num hide-sm">
                  <span>{w.invested != null ? usd(w.invested) : '–'}</span>
                  <small>{w.proceeds != null ? `${usd(w.proceeds)} out` : ''}</small>
                </td>
                <td className="c-num" data-label="Lifetime">
                  <b className={tone(w.lifetime?.total)}>{money(w.lifetime?.total)}</b>
                  {w.lifetime?.tokens != null && <small>{w.lifetime.tokens.toLocaleString('en-US')} coins traded</small>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {d.pnl === 'off' && <p className="note">Profit and loss columns turn on once a Solana Tracker key is added to the site.</p>}
      {d.pnl === 'error' && <p className="note">Profit and loss couldn’t be read just now. Holdings are still live.</p>}
      <p className="note">The biggest wallets by how much of the coin they hold, biggest first. Pools, bonding curves and other program accounts are left out{d.excluded ? ` (${d.excluded} here)` : ''}, so every row is a real wallet. Holdings from Solana through Helius{pnlOn ? '; PnL from Solana Tracker, in USD, including what’s still held' : ''}. Tap a wallet to see its holdings on Solscan. <a href={`https://solscan.io/token/${address}#holders`} target="_blank" rel="noopener noreferrer">Compare with Solscan&apos;s holder list</a>.</p>
    </div>
  );
}
