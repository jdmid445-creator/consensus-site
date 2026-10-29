import { hasRedis, redis } from './pool';
import { unescape, okSym, tagCoins } from './xfeed';

// Today's top 25 posts on X about memes and meme coins, ranked by engagement.
// Every X_TOP_SECONDS (default 90, shared across visitors through a Redis lock) it runs a few
// "Top" searches limited to today, merges them into the day's pool and refreshes the
// like/repost counts of posts already in it. Visitors read the ranked list from Redis.

const EVERY = Math.max(30, Number(process.env.X_TOP_SECONDS || 90));
const BASE = () => process.env.TWITTERAPI_IO_BASE || 'https://api.twitterapi.io';
const POOL_MAX = 300;
let mem = { day: '', pool: [], prev: {}, lockUntil: 0 };

export const xTopEnabled = () => Boolean(process.env.TWITTERAPI_IO_KEY);

// Midnight in New York, as unix seconds, and the date it belongs to.
function dayStart() {
  const now = new Date();
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((p) => [p.type, p.value]));
  const secsIntoDay = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  return { day: `${parts.year}-${parts.month}-${parts.day}`, start: Math.floor(now / 1000) - secsIntoDay };
}

const BIG_COINS = ['BONK', 'WIF', 'POPCAT', 'PENGU', 'TRUMP', 'FARTCOIN', 'MOODENG', 'PNUT', 'GOAT', 'SPX', 'MEW', 'DOGE', 'PEPE', 'SHIB'];
const MEMECOIN = /meme ?coins?|pump\.?fun|pumpswap|letsbonk|\$[A-Za-z][A-Za-z0-9_]{1,14}|\b[1-9A-HJ-NP-Za-km-z]{32,44}\b|degen|trenches|rug|ape(d)? in|market ?cap|\bmc\b|100x|\bdex\b/i;
const SPAM = /copy ?trad|private (tg|telegram|group)|prvt|alpha tg|tg me|dm for|join (my|our) (tg|telegram)|my call|early gems?|now buy|we are shilling|join late|giveaway|whitelist|via tg\b|airdrop.*(claim|link)|#(solana)?memecoins?\b.*#/i;

function queries(runners, since) {
  const syms = [];
  for (const r of [...runners].sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))) {
    if (okSym(r.symbol) && !syms.includes(r.symbol.toUpperCase())) syms.push(r.symbol.toUpperCase());
    if (syms.length >= 14) break;
  }
  const t = `since_time:${since} -filter:retweets`;
  return [
    // Today's runners
    syms.length && `(${syms.map((s) => `$${s}`).join(' OR ')}) min_faves:15 ${t}`,
    // Meme coins in general
    `(memecoin OR memecoins OR "meme coin" OR pumpfun OR "pump.fun" OR ${BIG_COINS.map((s) => `$${s}`).join(' OR ')}) min_faves:100 ${t}`,
    // Viral memes: tomorrow's narratives
    `(meme OR memes) min_faves:2000 -filter:replies ${t}`,
  ].filter(Boolean);
}

function norm(t) {
  const a = t.author || {};
  const q = t.quoted_tweet;
  const media = t.extendedEntities?.media || t.entities?.media || [];
  return {
    id: String(t.id),
    text: unescape(t.text),
    quoted: q ? { text: unescape(q.text), handle: q.author?.userName || '', name: q.author?.name || q.author?.userName || '' } : null,
    img: media.find((m) => m.media_url_https)?.media_url_https || null,
    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
    likes: t.likeCount || 0,
    reposts: t.retweetCount || 0,
    replies: t.replyCount || 0,
    quotes: t.quoteCount || 0,
    views: t.viewCount || 0,
    author: { handle: a.userName || '', name: a.name || a.userName || '', avatar: a.profilePicture || '', followers: a.followers || 0 },
    url: t.url || `https://x.com/${a.userName || 'i'}/status/${t.id}`,
  };
}

const score = (p) => p.likes + p.reposts * 3 + p.quotes * 3 + p.replies;

async function search(query, pages = 2) {
  const out = [];
  let cursor = '';
  for (let i = 0; i < pages; i++) {
    const u = new URL(`${BASE()}/twitter/tweet/advanced_search`);
    u.searchParams.set('query', query);
    u.searchParams.set('queryType', 'Top');
    if (cursor) u.searchParams.set('cursor', cursor);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(u, { headers: { 'x-api-key': process.env.TWITTERAPI_IO_KEY }, cache: 'no-store', signal: ctrl.signal });
      if (!res.ok) break;
      const j = await res.json();
      out.push(...(j.tweets || []).map(norm));
      if (!j.has_next_page || !j.next_cursor) break;
      cursor = j.next_cursor;
    } catch {
      break;
    } finally {
      clearTimeout(timer);
    }
  }
  return out;
}

const KEY = (day) => `x:top:${day}`;

async function load(day) {
  if (!hasRedis()) return mem.day === day ? { pool: mem.pool, prev: mem.prev } : { pool: [], prev: {} };
  try {
    const [r] = await redis([['GET', KEY(day)]]);
    return r?.result ? JSON.parse(r.result) : { pool: [], prev: {} };
  } catch {
    return { pool: [], prev: {} };
  }
}

async function lock() {
  if (!hasRedis()) {
    if (Date.now() < mem.lockUntil) return false;
    mem.lockUntil = Date.now() + EVERY * 1000;
    return true;
  }
  try {
    const [r] = await redis([['SET', 'x:top:lock', '1', 'NX', 'EX', EVERY]]);
    return r?.result === 'OK';
  } catch {
    return false;
  }
}

async function refresh(runners) {
  const { day, start } = dayStart();
  const state = await load(day);
  if (!(await lock())) return { day, ...state };
  const lists = await Promise.all(queries(runners, start).map((q, i) => search(q, i === 2 ? 1 : 2)));
  const byId = new Map(state.pool.map((p) => [p.id, p]));
  for (const p of lists.flat()) {
    if (new Date(p.createdAt).getTime() / 1000 < start) continue;
    if (SPAM.test(`${p.text} ${p.quoted?.text || ''}`)) continue;
    const old = byId.get(p.id);
    // Keep the highest counts seen; searches sometimes return stale numbers.
    byId.set(p.id, old ? { ...p, likes: Math.max(p.likes, old.likes), reposts: Math.max(p.reposts, old.reposts), replies: Math.max(p.replies, old.replies), quotes: Math.max(p.quotes, old.quotes), views: Math.max(p.views, old.views) } : p);
  }
  // Remember each post's rank before this refresh so the page can show movement.
  const prev = Object.fromEntries([...state.pool].sort((a, b) => score(b) - score(a)).slice(0, 40).map((p, i) => [p.id, i + 1]));
  const pool = [...byId.values()].sort((a, b) => score(b) - score(a)).slice(0, POOL_MAX);
  const next = { pool, prev };
  mem = { ...mem, day, pool, prev };
  if (hasRedis()) {
    try { await redis([['SET', KEY(day), JSON.stringify(next), 'EX', 2 * 24 * 3600]]); } catch {}
  }
  return { day, ...next };
}

export async function getXTop(runners) {
  if (!xTopEnabled() || !runners?.length) return null;
  const { pool, prev } = await refresh(runners);
  const bySym = new Map();
  for (const r of runners) if (okSym(r.symbol) && !bySym.has(r.symbol.toUpperCase())) bySym.set(r.symbol.toUpperCase(), r);
  const byAddr = new Map(runners.map((r) => [r.address, r]));
  const lite = (a) => { const r = byAddr.get(a); return r ? { address: r.address, name: r.name, symbol: r.symbol, image: r.image } : null; };

  const top = pool.slice(0, 25).map((p, i) => {
    const body = `${p.text} ${p.quoted?.text || ''}`;
    const coins = tagCoins(body, bySym, byAddr).map(lite).filter(Boolean);
    const tags = [...new Set([...body.matchAll(/\$([A-Za-z][A-Za-z0-9_]{1,14})/g)].map((m) => m[1].toUpperCase()))].filter((s) => !/^\d/.test(s)).slice(0, 4);
    return { ...p, rank: i + 1, was: Object.keys(prev).length ? prev[p.id] || null : i + 1, score: score(p), kind: coins.length || MEMECOIN.test(body) ? 'coin' : 'meme', coins, tags };
  });

  // Coins named most across the top posts.
  const count = new Map();
  for (const p of top) for (const t of p.tags) count.set(t, (count.get(t) || 0) + 1);
  const named = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([sym, n]) => ({ sym, n, coin: bySym.get(sym) ? lite(bySym.get(sym).address) : null }));

  return { top, named, every: EVERY, at: Date.now() };
}
