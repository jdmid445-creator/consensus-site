import { hasRedis, redis } from './pool';
import { chunk } from './http';

// Top-10 holder share for each runner, via Helius RPC (HELIUS_API_KEY).
// The liquidity pool's own token account is left out, so the number reflects real
// wallets: it's the account whose balance matches the pool's token amount on DexScreener.
// Results are cached for 30 minutes per token (Redis if set up, otherwise memory),
// which keeps usage around 2 RPC calls per runner per half hour.
const TTL_MS = 30 * 60 * 1000;
const HKEY = 'consensus:holders';
const memory = new Map();

export const heliusEnabled = () => Boolean(process.env.HELIUS_API_KEY);

async function rpcBatch(calls) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${process.env.HELIUS_RPC_BASE || 'https://mainnet.helius-rpc.com'}/?api-key=${process.env.HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(calls),
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn('[helius]', res.status);
      return [];
    }
    const out = await res.json();
    return Array.isArray(out) ? out : [];
  } catch (e) {
    console.warn('[helius] failed:', e.message);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function top10Share(accounts, supply, poolAmount) {
  if (!Array.isArray(accounts) || !(supply > 0)) return null;
  const amounts = accounts.map((a) => Number(a.uiAmount) || 0).sort((a, b) => b - a);
  // drop the pool's vault (balance within 3% of the pool's token amount)
  if (poolAmount > 0) {
    const i = amounts.findIndex((x) => Math.abs(x - poolAmount) / poolAmount < 0.03);
    if (i >= 0) amounts.splice(i, 1);
  }
  const top = amounts.slice(0, 10).reduce((s, x) => s + x, 0);
  return Math.min(1, top / supply);
}

async function loadCache(addresses) {
  const now = Date.now();
  const found = new Map();
  if (hasRedis() && addresses.length) {
    try {
      const [out] = await redis([['HMGET', HKEY, ...addresses]]);
      (out?.result || []).forEach((v, i) => {
        if (!v) return;
        const d = JSON.parse(v);
        if (now - d.at < TTL_MS) found.set(addresses[i], d.top10);
      });
      return found;
    } catch (e) {
      console.warn('[helius] cache read failed:', e.message);
    }
  }
  for (const a of addresses) {
    const d = memory.get(a);
    if (d && now - d.at < TTL_MS) found.set(a, d.top10);
  }
  return found;
}

async function saveCache(entries) {
  const at = Date.now();
  for (const [a, top10] of entries) memory.set(a, { top10, at });
  if (hasRedis() && entries.length) {
    try {
      const hset = ['HSET', HKEY];
      for (const [a, top10] of entries) hset.push(a, JSON.stringify({ top10, at }));
      await redis([hset, ['EXPIRE', HKEY, 24 * 3600]]);
    } catch (e) {
      console.warn('[helius] cache write failed:', e.message);
    }
  }
}

// Adds `top10` (0..1, or null if unknown) to each runner.
export async function addHolderShares(runners) {
  if (!heliusEnabled() || !runners.length) return runners.map((r) => ({ ...r, top10: null }));
  const cached = await loadCache(runners.map((r) => r.address));
  const missing = runners.filter((r) => !cached.has(r.address));

  const fresh = [];
  for (const group of chunk(missing, 25)) {
    const calls = group.flatMap((r, i) => [
      { jsonrpc: '2.0', id: `l${i}`, method: 'getTokenLargestAccounts', params: [r.address, { commitment: 'confirmed' }] },
      { jsonrpc: '2.0', id: `s${i}`, method: 'getTokenSupply', params: [r.address, { commitment: 'confirmed' }] },
    ]);
    const res = await rpcBatch(calls);
    const byId = new Map(res.map((x) => [x.id, x.result]));
    group.forEach((r, i) => {
      const largest = byId.get(`l${i}`)?.value;
      const supply = Number(byId.get(`s${i}`)?.value?.uiAmount);
      const share = top10Share(largest, supply, r.liquidityBase);
      if (share != null) fresh.push([r.address, share]);
    });
  }
  await saveCache(fresh);
  const all = new Map([...cached, ...fresh]);
  return runners.map((r) => ({ ...r, top10: all.has(r.address) ? all.get(r.address) : null }));
}
