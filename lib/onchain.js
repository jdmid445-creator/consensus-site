import { after } from 'next/server';
import { hasRedis, redis } from './pool';

// On-chain stats for one coin, from Helius:
//   holders    number of wallets holding it (counted up to 10,000)
//   top10      share held by the 10 biggest wallets, pool excluded
//   topHolder  share held by the single biggest wallet, pool excluded
//   whales     wallets holding 1% or more of supply, pool excluded
//   dev        the wallet that created the coin: how much it got at launch, how much it holds now
//   bundle     wallets (other than the dev) that bought in the same block the coin was created
//   early      wallets that bought in the next 5 blocks after that
// Holdings refresh every ~15 seconds; the launch history is read once and kept 6 hours, the
// holder count 10 minutes. Anything Helius can't answer comes back null, never guessed.
const KEY = 'consensus:onchain:';
const TTL = 12;                 // live holdings, supply, top wallets (seconds)
const LAUNCH_TTL = 6 * 3600;     // launch history doesn't change
const HOLDERS_TTL = 60;          // holder count (up to 10 calls)
const memory = new Map();
const EARLY_SLOTS = 5;

const rpcUrl = () => `${process.env.HELIUS_RPC_BASE || 'https://mainnet.helius-rpc.com'}/?api-key=${process.env.HELIUS_API_KEY}`;

async function rpc(body, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(rpcUrl(), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal, cache: 'no-store' });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return await res.json();
  } catch (e) {
    return { error: e.name === 'AbortError' ? 'timed out' : e.message };
  } finally {
    clearTimeout(t);
  }
}

const SYSTEM_PROGRAM = '11111111111111111111111111111111';
// Pool authorities that sign for pool vaults but aren't accounts themselves.
const POOL_AUTHORITIES = new Set([
  '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1', // Raydium AMM v4
  'GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL', // Raydium CPMM
  'WLHv2UAZm6z4KyaaELi5pjdbJh6RESMva1Rnn8pJVVh', // Raydium LaunchLab
]);

const keyOf = (k) => (typeof k === 'string' ? k : k?.pubkey);

// Net token change per owner in one transaction, for this mint.
function tokenDeltas(tx, mint) {
  const out = new Map();
  const add = (list, sign) => {
    for (const b of list || []) {
      if (b.mint !== mint || !b.owner) continue;
      const amt = Number(b.uiTokenAmount?.uiAmount ?? b.uiTokenAmount?.uiAmountString ?? 0) || 0;
      out.set(b.owner, (out.get(b.owner) || 0) + sign * amt);
    }
  };
  add(tx.meta?.preTokenBalances, -1);
  add(tx.meta?.postTokenBalances, +1);
  return out;
}

async function holderCount(mint) {
  let total = 0;
  for (let page = 1; page <= 10; page++) {
    const r = await rpc({ jsonrpc: '2.0', id: 'h', method: 'getTokenAccounts', params: { mint, page, limit: 1000, options: { showZeroBalance: false } } });
    const n = r?.result?.token_accounts?.length;
    if (n == null) return total ? { count: total, capped: false } : null;
    total += n;
    if (n < 1000) return { count: total, capped: false };
  }
  return { count: total, capped: true };
}

async function balancesOf(owners, mint) {
  if (!owners.length) return new Map();
  const calls = owners.map((o, i) => ({ jsonrpc: '2.0', id: String(i), method: 'getTokenAccountsByOwner', params: [o, { mint }, { encoding: 'jsonParsed' }] }));
  const res = await rpc(calls, 12000);
  const out = new Map();
  if (!Array.isArray(res)) return out;
  for (const r of res) {
    const owner = owners[Number(r.id)];
    const sum = (r.result?.value || []).reduce((s, a) => s + (Number(a.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? a.account?.data?.parsed?.info?.tokenAmount?.uiAmountString) || 0), 0);
    out.set(owner, sum);
  }
  return out;
}

async function launch(mint, poolOwners) {
  const r = await rpc({
    jsonrpc: '2.0', id: 'l', method: 'getTransactionsForAddress',
    params: [mint, { transactionDetails: 'full', sortOrder: 'asc', limit: 100, maxSupportedTransactionVersion: 0, filters: { status: 'succeeded' } }],
  }, 15000);
  const txs = r?.result?.data;
  if (!Array.isArray(txs) || !txs.length) return { error: r?.error?.message || r?.error || 'no launch history' };

  const first = txs[0];
  const creator = keyOf(first.transaction?.message?.accountKeys?.[0]);
  const launchSlot = first.slot;
  const bundleBuys = new Map();
  const earlyBuys = new Map();
  let devGot = 0;
  for (const tx of txs) {
    if (tx.slot > launchSlot + EARLY_SLOTS) break;
    for (const [owner, d] of tokenDeltas(tx, mint)) {
      if (d <= 0 || poolOwners.has(owner)) continue;
      if (owner === creator) { devGot += d; continue; }
      const bucket = tx.slot === launchSlot ? bundleBuys : earlyBuys;
      bucket.set(owner, (bucket.get(owner) || 0) + d);
    }
  }
  for (const o of bundleBuys.keys()) earlyBuys.delete(o);
  return { creator, launchSlot, launchTime: first.blockTime ? first.blockTime * 1000 : null, devGot, bundleBuys, earlyBuys };
}

async function load(key, ttl) {
  if (hasRedis()) {
    try {
      const [res] = await redis([['GET', key]]);
      if (res?.result) return JSON.parse(res.result);
    } catch {}
  }
  const m = memory.get(key);
  return m && Date.now() - m.at < ttl * 1000 ? m.v : null;
}

async function save(key, v, ttl) {
  memory.set(key, { v, at: Date.now() });
  if (hasRedis()) {
    try { await redis([['SET', key, JSON.stringify(v), 'EX', ttl]]); } catch {}
  }
}

// Wait at most `ms` for a slow step; if it runs over, let it finish in the background (so the
// next request gets it from the cache) and answer now without it.
async function within(ms, promise) {
  let timer;
  const late = new Promise((res) => { timer = setTimeout(() => res(undefined), ms); });
  const v = await Promise.race([promise, late]);
  clearTimeout(timer);
  if (v === undefined) { try { after(() => promise.catch(() => {})); } catch {} }
  return v;
}

async function cached(key, ttl, fn) {
  const hit = await load(key, ttl);
  if (hit) return hit;
  const v = await fn();
  if (v) await save(key, v, ttl);
  return v;
}

export async function getOnchain(mint, { pairAddress, poolTokens = 0 } = {}) {
  if (!process.env.HELIUS_API_KEY) return null;
  const hit = await load(KEY + mint, TTL);
  if (hit) return hit;

  const [supplyRes, largestRes, holders] = await Promise.all([
    rpc({ jsonrpc: '2.0', id: 's', method: 'getTokenSupply', params: [mint] }),
    rpc({ jsonrpc: '2.0', id: 'l', method: 'getTokenLargestAccounts', params: [mint] }),
    within(2500, cached(`${KEY}holders:${mint}`, HOLDERS_TTL, () => holderCount(mint))),
  ]);
  const supply = Number(supplyRes?.result?.value?.uiAmount ?? supplyRes?.result?.value?.uiAmountString) || 0;
  const largest = (largestRes?.result?.value || []).map((a) => ({ address: a.address, amount: Number(a.uiAmount ?? a.uiAmountString) || 0 }));

  // Owners of the biggest accounts, to spot the pool (its owner is the pair / pool authority,
  // and its balance matches the pool's token amount on DexScreener).
  // Who owns each of the biggest token accounts. Retried, because a rate-limited answer here
  // would leave the whale list empty.
  let infos = null;
  for (let tries = 0; largest.length && tries < 3; tries++) {
    infos = await rpc({ jsonrpc: '2.0', id: 'o', method: 'getMultipleAccounts', params: [largest.map((a) => a.address), { encoding: 'jsonParsed' }] });
    if (Array.isArray(infos?.result?.value) && infos.result.value.some((v) => v?.data?.parsed?.info?.owner)) break;
    await new Promise((res) => setTimeout(res, 400 * (tries + 1)));
  }
  const owners = (infos?.result?.value || []).map((v) => v?.data?.parsed?.info?.owner || null);

  // Which owners are real wallets? A wallet is owned by the System Program (or doesn't exist
  // as an account at all, if it holds no SOL). Anything owned by another program is a pool,
  // bonding curve, vault or locker: those hold tokens for others, so they aren't holders.
  const uniqueOwners = [...new Set(owners.filter(Boolean))];
  const ownerInfo = uniqueOwners.length
    ? await rpc({ jsonrpc: '2.0', id: 'w', method: 'getMultipleAccounts', params: [uniqueOwners, { encoding: 'base64', dataSlice: { offset: 0, length: 0 } }] })
    : null;
  const programOwned = new Set();
  (ownerInfo?.result?.value || []).forEach((v, i) => {
    if (v && v.owner && v.owner !== SYSTEM_PROGRAM) programOwned.add(uniqueOwners[i]);
  });

  const poolOwners = new Set();
  largest.forEach((a, i) => {
    a.owner = owners[i];
    const isPool =
      (pairAddress && a.owner === pairAddress) ||
      (!a.owner && poolTokens > 0 && Math.abs(a.amount - poolTokens) / poolTokens < 0.03) ||
      (a.owner && (programOwned.has(a.owner) || POOL_AUTHORITIES.has(a.owner)));
    a.pool = isPool;
    if (isPool && a.owner) poolOwners.add(a.owner);
  });
  const wallets = largest.filter((a) => !a.pool);
  const share = (x) => (supply > 0 ? x / supply : null);

  const out = {
    supply,
    holders: holders?.count ?? null,
    holdersCapped: holders?.capped || false,
    top10: supply ? share(wallets.slice(0, 10).reduce((s, a) => s + a.amount, 0)) : null,
    topHolder: wallets[0] ? share(wallets[0].amount) : null,
    whales: supply ? wallets.filter((a) => a.amount / supply >= 0.01).length : null,
    whalesCapped: supply ? wallets.length >= 19 && wallets[wallets.length - 1].amount / supply >= 0.01 : false,
    dev: null,
    bundle: null,
    early: null,
    launchNote: '',
    // The biggest wallets (pool excluded), merged by owner, for the Whales tab.
    wallets: [],
    excluded: largest.filter((a) => a.pool).length,
    at: Date.now(),
  };
  const byOwner = new Map();
  for (const a of wallets) {
    if (!a.owner) continue;
    byOwner.set(a.owner, (byOwner.get(a.owner) || 0) + a.amount);
  }
  out.wallets = [...byOwner].map(([owner, amount]) => ({ owner, amount, share: share(amount), tags: [] })).sort((a, b) => b.amount - a.amount);

  // Launch history is fixed once it happens, so it's read once and kept (as plain objects).
  const lRaw = await within(4000, cached(`${KEY}launch:${mint}`, LAUNCH_TTL, async () => {
    const x = await launch(mint, poolOwners);
    if (x.error) return { error: x.error };
    return { ...x, bundleBuys: Object.fromEntries(x.bundleBuys), earlyBuys: Object.fromEntries(x.earlyBuys) };
  }));
  const launchPending = lRaw === undefined;
  const l = lRaw?.error || !lRaw ? { error: lRaw?.error || 'no launch history' } : { ...lRaw, bundleBuys: new Map(Object.entries(lRaw.bundleBuys)), earlyBuys: new Map(Object.entries(lRaw.earlyBuys)) };
  if (launchPending) {
    out.launchNote = 'Reading the launch history… it shows up on the next refresh.';
  } else if (l.error) {
    out.launchNote = /method|not (found|supported|available)|-32601|plan|403/i.test(l.error) ? 'Launch history needs a Helius plan that includes getTransactionsForAddress.' : 'Launch history isn’t available for this coin right now.';
  } else {
    const people = [l.creator, ...l.bundleBuys.keys(), ...l.earlyBuys.keys()].filter(Boolean).slice(0, 40);
    const now = await balancesOf(people, mint);
    const sum = (m) => [...m.values()].reduce((s, x) => s + x, 0);
    const heldBy = (m) => [...m.keys()].reduce((s, o) => s + (now.get(o) || 0), 0);
    out.dev = { wallet: l.creator, bought: share(l.devGot), holds: now.has(l.creator) ? share(now.get(l.creator)) : null };
    out.bundle = { wallets: l.bundleBuys.size, bought: share(sum(l.bundleBuys)), holds: share(heldBy(l.bundleBuys)) };
    out.early = { wallets: l.earlyBuys.size, bought: share(sum(l.earlyBuys)), holds: share(heldBy(l.earlyBuys)) };
    out.launchTime = l.launchTime;
    for (const w of out.wallets) {
      if (w.owner === l.creator) w.tags.push('dev');
      else if (l.bundleBuys.has(w.owner)) w.tags.push('bundle');
      else if (l.earlyBuys.has(w.owner)) w.tags.push('early');
    }
  }
  if (out.wallets.length || !largest.length) await save(KEY + mint, out, TTL);
  return out;
}
