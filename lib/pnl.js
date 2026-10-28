import { hasRedis, redis } from './pool';

// Wallet profit and loss from Solana Tracker's PnL API (needs SOLANATRACKER_API_KEY).
// One call per coin covers every wallet we ask about: each wallet's PnL on this coin, plus
// its lifetime PnL across everything it has traded, plus a name when the wallet is known
// (a KOL, an exchange, a bot, a .sol domain). Cached 2 minutes per coin and only fetched
// when someone opens the Whales tab, to stay inside the plan's monthly request count.
const BASE = process.env.SOLANATRACKER_BASE || 'https://data.solanatracker.io';
const TTL = 120;
const memory = new Map();
let lastError = '';
export const pnlLastError = () => lastError;
export const pnlEnabled = () => Boolean(process.env.SOLANATRACKER_API_KEY);

const n = (x) => (x == null || !isFinite(Number(x)) ? null : Number(x));

function shape(p) {
  const coin = p?.pnl?.token || p?.pnl || {};
  const life = p?.pnl?.wallet || null;
  const id = p?.identity || null;
  return {
    coin: { total: n(coin.total), realized: n(coin.realized), unrealized: n(coin.unrealized) },
    invested: n(p?.invested ?? p?.volume?.buyUsd),
    proceeds: n(p?.proceeds ?? p?.volume?.sellUsd),
    roi: n(p?.roi),
    avgBuy: n(p?.averages?.buy ?? p?.current?.avgCost),
    buys: n(p?.counts?.buys),
    sells: n(p?.counts?.sells),
    firstBuy: n(p?.timing?.firstBuy ?? p?.timing?.firstTrade),
    holdSecs: n(p?.timing?.holdTimeSecs),
    lifetime: life ? { total: n(life.total), realized: n(life.realized), invested: n(life.invested), trades: n(life.totalTrades), tokens: n(life.tokensTraded) } : null,
    identity: id && (id.name || id.twitter || id.type) ? { name: id.name || id.sns?.domain || null, twitter: id.twitter || null, type: id.type || null, avatar: id.avatar || null } : null,
  };
}

async function fetchPositions(mint, wallets) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${BASE}/v2/pnl/tokens/${mint}/positions/batch`, {
      method: 'POST',
      headers: { 'x-api-key': process.env.SOLANATRACKER_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ wallets }),
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      lastError = `HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`;
      console.warn('[pnl]', lastError);
      return null;
    }
    const d = await res.json();
    lastError = '';
    const out = {};
    for (const p of d?.positions || []) if (p?.wallet) out[p.wallet] = shape(p);
    return out;
  } catch (e) {
    lastError = e.name === 'AbortError' ? 'timed out' : e.message;
    console.warn('[pnl]', lastError);
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Returns { [wallet]: {...} } or null when PnL isn't available.
export async function getPnl(mint, wallets) {
  if (!pnlEnabled() || !wallets.length) return null;
  const key = `consensus:pnl:${mint}`;
  const want = [...wallets].sort().join(',');
  let hit = null;
  if (hasRedis()) {
    try {
      const [r] = await redis([['GET', key]]);
      if (r?.result) hit = JSON.parse(r.result);
    } catch {}
  } else {
    const m = memory.get(key);
    if (m && Date.now() - m.at < TTL * 1000) hit = m.v;
  }
  // Reuse the cached answer while the whale list is mostly the same.
  if (hit && wallets.filter((w) => hit.data[w]).length >= Math.min(wallets.length, hit.asked) * 0.8) return hit.data;
  const data = await fetchPositions(mint, wallets);
  if (!data) return hit?.data || null;
  const v = { data, asked: wallets.length, want };
  memory.set(key, { v, at: Date.now() });
  if (hasRedis()) {
    try { await redis([['SET', key, JSON.stringify(v), 'EX', TTL]]); } catch {}
  }
  return data;
}
