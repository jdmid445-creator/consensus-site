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

// ---- Top traders ("smart money") ----
// The 250 most profitable Solana traders from Solana Tracker's leaderboard, refreshed daily.
const TOP_KEY = 'consensus:toptraders';
const TOP_TTL = 24 * 3600;
let topMemory = null;

async function stGet(path) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { 'x-api-key': process.env.SOLANATRACKER_API_KEY }, signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) { lastError = `HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`; return null; }
    return await res.json();
  } catch (e) {
    lastError = e.name === 'AbortError' ? 'timed out' : e.message;
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function getTopTraders() {
  if (!pnlEnabled()) return [];
  if (topMemory && Date.now() - topMemory.at < TOP_TTL * 1000) return topMemory.list;
  if (hasRedis()) {
    try {
      const [r] = await redis([['GET', TOP_KEY]]);
      if (r?.result) { const v = JSON.parse(r.result); topMemory = v; return v.list; }
    } catch {}
  }
  const list = [];
  let cursor = '';
  for (let page = 0; page < 3 && list.length < 250; page++) {
    const d = await stGet(`/v2/pnl/leaderboard/top?sort=realized&direction=desc&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    const rows = d?.traders || [];
    for (const t of rows) {
      if (!t?.wallet || list.length >= 250 || list.some((x) => x.wallet === t.wallet)) continue;
      list.push({
        wallet: t.wallet,
        rank: list.length + 1,
        realized: n(t.period?.realized ?? t.ending?.pnl?.realized),
        winRate: n(t.winRate ?? t.period?.days?.winRate),
        name: t.identity?.name || t.identity?.sns?.domain || null,
        twitter: t.identity?.twitter || null,
      });
    }
    cursor = d?.pagination?.hasMore ? d.pagination.nextCursor : '';
    if (!cursor) break;
  }
  if (!list.length) return topMemory?.list || [];
  topMemory = { at: Date.now(), list };
  if (hasRedis()) {
    try { await redis([['SET', TOP_KEY, JSON.stringify(topMemory), 'EX', TOP_TTL]]); } catch {}
  }
  return list;
}

// Which of the top 250 traders hold this coin right now, and how much. Two batch calls per
// coin (200 + 50 wallets), cached 2 minutes.
export async function getTopTradersIn(mint, supply) {
  const top = await getTopTraders();
  if (!top.length) return null;
  const key = `consensus:smart:${mint}`;
  if (hasRedis()) {
    try {
      const [r] = await redis([['GET', key]]);
      if (r?.result) return JSON.parse(r.result);
    } catch {}
  } else {
    const m = memory.get(key);
    if (m && Date.now() - m.at < TTL * 1000) return m.v;
  }
  const byWallet = new Map(top.map((t) => [t.wallet, t]));
  const groups = [top.slice(0, 200), top.slice(200)].filter((g) => g.length);
  const results = await Promise.all(groups.map(async (g) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(`${BASE}/v2/pnl/tokens/${mint}/positions/batch`, {
        method: 'POST',
        headers: { 'x-api-key': process.env.SOLANATRACKER_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ wallets: g.map((x) => x.wallet) }),
        signal: ctrl.signal,
        cache: 'no-store',
      });
      return res.ok ? await res.json() : null;
    } catch { return null; } finally { clearTimeout(t); }
  }));
  if (results.every((x) => !x)) return null;
  const holders = [];
  for (const d of results) {
    for (const p of d?.positions || []) {
      const tt = byWallet.get(p?.wallet);
      const bal = n(p?.current?.balance ?? p?.position?.balance);
      if (!tt || !bal || bal <= 0 || holders.some((h) => h.wallet === tt.wallet)) continue;
      const s = shape(p);
      holders.push({ ...tt, balance: bal, share: supply > 0 ? bal / supply : null, value: n(p?.current?.value ?? p?.position?.value), coin: s.coin, invested: s.invested, name: tt.name || s.identity?.name || null });
    }
  }
  holders.sort((a, b) => b.balance - a.balance);
  memory.set(key, { v: holders, at: Date.now() });
  if (hasRedis()) {
    try { await redis([['SET', key, JSON.stringify(holders), 'EX', TTL]]); } catch {}
  }
  return holders;
}
