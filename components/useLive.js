'use client';

import { useEffect, useState } from 'react';

// One shared live feed for the whole page. Every component asks for the coins it shows;
// a single poller fetches all of them together (30 per request) and hands each component
// fresh numbers. It reads DexScreener straight from the browser (no cache in between); if
// that's blocked, it falls back to our own /api/live. It pauses while the tab is hidden.
//
// Returned per address: { priceUsd, marketCap, liquidity, volume: {m5,h1,h6,h24},
//   change: {m5,h1,h6,h24}, buys24h, sells24h, at }
const subs = new Map(); // id -> { addrs:Set, ms, set }
let data = {};
let timer = null;
let running = false;
let direct = true;
let nextId = 1;

const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function shape(p) {
  return {
    priceUsd: Number(p.priceUsd) || null,
    marketCap: p.marketCap || p.fdv || null,
    liquidity: p.liquidity?.usd ?? null,
    volume: { m5: p.volume?.m5 ?? null, h1: p.volume?.h1 ?? null, h6: p.volume?.h6 ?? null, h24: p.volume?.h24 ?? null },
    change: { m5: p.priceChange?.m5 ?? null, h1: p.priceChange?.h1 ?? null, h6: p.priceChange?.h6 ?? null, h24: p.priceChange?.h24 ?? null },
    buys24h: p.txns?.h24?.buys ?? null,
    sells24h: p.txns?.h24?.sells ?? null,
    at: Date.now(),
  };
}

async function fetchGroup(group) {
  if (direct) {
    try {
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${group.join(',')}`, { cache: 'no-store' });
      if (res.ok) {
        const pairs = await res.json();
        const best = {};
        for (const p of Array.isArray(pairs) ? pairs : []) {
          const a = p?.baseToken?.address;
          if (!a || p.chainId !== 'solana') continue;
          if (!best[a] || (p.liquidity?.usd || 0) > (best[a].liquidity?.usd || 0)) best[a] = p;
        }
        return Object.fromEntries(Object.entries(best).map(([a, p]) => [a, shape(p)]));
      }
      if (res.status !== 429) direct = false;
    } catch {
      direct = false; // blocked by the browser or network: use our proxy from now on
    }
  }
  try {
    const res = await fetch(`/api/live?a=${group.join(',')}`, { cache: 'no-store' });
    return res.ok ? await res.json() : {};
  } catch {
    return {};
  }
}

function interval() {
  let ms = 30000;
  for (const s of subs.values()) ms = Math.min(ms, s.ms);
  return ms;
}

async function tick() {
  if (running) return;
  running = true;
  try {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible' && subs.size) {
      const all = new Set();
      for (const s of subs.values()) for (const a of s.addrs) all.add(a);
      const list = [...all];
      const groups = [];
      for (let i = 0; i < list.length; i += 30) groups.push(list.slice(i, i + 30));
      const results = await Promise.all(groups.map(fetchGroup));
      const merged = { ...data };
      for (const r of results) Object.assign(merged, r);
      data = merged;
      for (const s of subs.values()) s.set(data);
    }
  } finally {
    running = false;
    clearTimeout(timer);
    if (subs.size) timer = setTimeout(tick, interval());
  }
}

function onVisible() {
  if (document.visibilityState === 'visible') { clearTimeout(timer); tick(); }
}

export default function useLive(addresses, ms = 15000) {
  const [snap, setSnap] = useState(data);
  const key = addresses.filter((a) => a && MINT.test(a)).join(',');

  useEffect(() => {
    if (!key) return;
    const id = nextId++;
    const first = subs.size === 0;
    subs.set(id, { addrs: new Set(key.split(',')), ms, set: setSnap });
    if (first) document.addEventListener('visibilitychange', onVisible);
    // fetch soon so a new component doesn't wait a full interval
    clearTimeout(timer);
    timer = setTimeout(tick, first ? 0 : 300);
    return () => {
      subs.delete(id);
      if (!subs.size) {
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', onVisible);
      }
    };
  }, [key, ms]);

  return snap;
}
