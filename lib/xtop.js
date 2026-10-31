import { hasRedis, redis } from './pool';
import { xget, later } from './xapi';
import { unescape, okSym, tagCoins } from './xfeed';

// Today's top 25 posts on X about memes and meme coins, ranked by engagement.
// Every X_TOP_SECONDS (default 90, shared across visitors through a Redis lock) it runs a few
// "Top" searches limited to today, merges them into the day's pool and refreshes the
// like/repost counts of posts already in it. Visitors read the ranked list from Redis.

// Re-checks X every 15 minutes for new popular posts and fresh counts.
const EVERY = 15 * 60;
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
// A post counts as a meme coin post only if it plainly is one: a cashtag, a contract address
// or meme coin words. Anything else is a plain meme.
const MEMECOIN = /meme ?coins?|pump\.?fun|pumpswap|letsbonk|\$[A-Za-z][A-Za-z0-9_]{1,14}\b|\b[1-9A-HJ-NP-Za-km-z]{32,44}\b|\btrenches\b|market ?cap|\bsolana\b|\bcrypto\b|\bon-?chain\b|\bdexscreener\b/i;
// Shills, call-group brags and engagement farming.
const SPAM = /copy ?trad|private (tg|telegram|group)|prvt|alpha tg|tg me|dm for|join (my|our) (tg|telegram)|my call|early gems?|now buy|we are shilling|join late|giveaway|whitelist|via tg\b|airdrop.*(claim|link)|i gave you|told you to (ape|buy|get)|it did \d+x|\b\d{3,}x\b|\b1000x\b|next \d+x|drops? tomorrow|\bengage\b|addys?\b|drop (your )?(wallet|addy|sol address)|\$\d+ to (one|\d+)|like (&|and) (rt|retweet)|#(solana)?memecoins?\b.*#/i;

function queries(runners, since) {
  const syms = [];
  for (const r of [...runners].sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))) {
    if (okSym(r.symbol) && !syms.includes(r.symbol.toUpperCase())) syms.push(r.symbol.toUpperCase());
    if (syms.length >= 14) break;
  }
  const t = `since_time:${since} lang:en -filter:retweets`;
  return [
    // Today's runners
    syms.length && { lane: 'coin', q: `(${syms.map((s) => `$${s}`).join(' OR ')}) min_faves:20 ${t}` },
    // Meme coins in general
    { lane: 'coin', q: `(memecoin OR memecoins OR "meme coin" OR pumpfun OR "pump.fun" OR trenches OR ${BIG_COINS.map((s) => `$${s}`).join(' OR ')}) min_faves:50 ${t}` },
    // Viral memes: tomorrow's narratives
    { lane: 'meme', q: `(meme OR memes) min_faves:2000 -filter:replies ${t}` },
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

let limited = false;
async function search(query, pages = 2) {
  const out = [];
  let cursor = '';
  for (let i = 0; i < pages; i++) {
    const u = new URL(`${BASE()}/twitter/tweet/advanced_search`);
    u.searchParams.set('query', query);
    u.searchParams.set('queryType', 'Top');
    if (cursor) u.searchParams.set('cursor', cursor);
    try {
      const res = await xget(u.toString());
      if (res.status === 429) { limited = true; break; }
      if (!res.ok) break;
      const j = await res.json();
      out.push(...(j.tweets || []).map(norm));
      if (!j.has_next_page || !j.next_cursor) break;
      cursor = j.next_cursor;
    } catch {
      break;
    }
  }
  return out;
}

const KEY = (day) => `x:top:${day}`;

async function load(day) {
  if (!hasRedis()) return mem.day === day ? { pool: mem.pool, prev: mem.prev, counts: mem.counts, turn: mem.turn, slowUntil: mem.slowUntil, refreshedAt: mem.refreshedAt } : { pool: [], prev: {}, turn: mem.turn, slowUntil: mem.slowUntil };
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

const MIN_LIKES = { coin: 30, meme: 1500 };
const LISTS = { all: (p) => true, coin: (p) => p.kind === 'coin', meme: (p) => p.kind === 'meme' };

// Ranked lists from the pool. "All" keeps meme coins first in line: plain memes get at most 8 of the 25 spots.
function rank(pool) {
  pool = pool.map((p) => ({ ...p, kind: MEMECOIN.test(`${p.text} ${p.quoted?.text || ''}`) ? 'coin' : 'meme' })).filter((p) => p.likes >= MIN_LIKES[p.kind]);
  const sorted = pool.filter((p) => !SPAM.test(`${p.text} ${p.quoted?.text || ''}`)).sort((a, b) => score(b) - score(a));
  const out = { coin: sorted.filter(LISTS.coin).slice(0, 25), meme: sorted.filter(LISTS.meme).slice(0, 25) };
  const memes = out.meme.slice(0, 8);
  // "All" leads with meme coin posts; the three biggest plain memes slot in after the top five.
  out.all = [...out.coin.slice(0, 5), ...memes.slice(0, 3), ...out.coin.slice(5)].slice(0, 25);
  return out;
}

async function refresh(runners) {
  const { day, start } = dayStart();
  const state = await load(day);
  if (!(await lock())) return { day, ...state };
  // The searches run after the page is sent, a few seconds apart; visitors see the last
  // results until these land (the page polls and picks them up).
  const work = async () => {
  const all = queries(runners, start);
  const turn = (state.turn || 0) % all.length;
  // Full mode: every search, two pages each, on every refresh. If the API pushes back with
  // rate limits, drop to one search per refresh for ten minutes, then try full mode again.
  const full = !(state.slowUntil > Date.now());
  limited = false;
  const qs = full ? all : [all[turn]];
  const lists = full ? await Promise.all(all.map(({ q }) => search(q, 2))) : [await search(all[turn].q, 1)];
  const slowUntil = limited ? Date.now() + 10 * 60e3 : full ? 0 : state.slowUntil;
  const byId = new Map(state.pool.map((p) => [p.id, p]));
  const counts = { ...(state.counts || {}) };
  lists.forEach((list, i) => {
    const lane = qs[i].lane;
    counts[`${lane}${full ? i : turn}`] = list.length;
    for (const p of list) {
      if (new Date(p.createdAt).getTime() / 1000 < start) continue;
      const body = `${p.text} ${p.quoted?.text || ''}`;
      if (SPAM.test(body)) continue;
      const kind = MEMECOIN.test(body) ? 'coin' : 'meme';
      const old = byId.get(p.id);
      const merged = old ? { ...p, likes: Math.max(p.likes, old.likes), reposts: Math.max(p.reposts, old.reposts), replies: Math.max(p.replies, old.replies), quotes: Math.max(p.quotes, old.quotes), views: Math.max(p.views, old.views) } : p;
      if (merged.likes < MIN_LIKES[kind]) continue;
      byId.set(p.id, { ...merged, kind });
    }
  });
  // Remember each post's rank before this refresh so the page can show movement.
  const before = rank(state.pool.filter((p) => p.kind));
  const prev = Object.fromEntries(Object.entries(before).map(([k, l]) => [k, Object.fromEntries(l.map((p, i) => [p.id, i + 1]))]));
  const pool = [...byId.values()].filter((p) => p.kind && p.likes >= MIN_LIKES[p.kind]).sort((a, b) => score(b) - score(a)).slice(0, POOL_MAX);
  const next = { pool, prev, counts, turn: turn + 1, slowUntil, mode: full ? 'full' : 'rotate', refreshedAt: Date.now() };
  mem = { ...mem, day, pool, prev, counts, turn: turn + 1, slowUntil, refreshedAt: next.refreshedAt };
  if (hasRedis()) {
    try { await redis([['SET', KEY(day), JSON.stringify(next), 'EX', 2 * 24 * 3600]]); } catch {}
  }
  return { day, ...next };
  };
  if (state.pool.length && later(work)) return { day, ...state };
  return work();
}

export async function getXTop(runners) {
  if (!xTopEnabled() || !runners?.length) return null;
  const { pool, prev = {}, counts, mode, refreshedAt } = await refresh(runners);
  const bySym = new Map();
  for (const r of runners) if (okSym(r.symbol) && !bySym.has(r.symbol.toUpperCase())) bySym.set(r.symbol.toUpperCase(), r);
  const byAddr = new Map(runners.map((r) => [r.address, r]));
  const lite = (a) => { const r = byAddr.get(a); return r ? { address: r.address, name: r.name, symbol: r.symbol, image: r.image } : null; };
  const dress = (p) => {
    const body = `${p.text} ${p.quoted?.text || ''}`;
    const coins = tagCoins(body, bySym, byAddr).map(lite).filter(Boolean);
    const tags = [...new Set([...body.matchAll(/\$([A-Za-z][A-Za-z0-9_]{1,14})/g)].map((m) => m[1].toUpperCase()))].slice(0, 4);
    return { ...p, score: score(p), coins, tags };
  };
  const ranked = rank(pool.filter((p) => p.kind));
  const lists = {};
  for (const [name, l] of Object.entries(ranked)) {
    const pr = prev[name] || {};
    const fresh = !Object.keys(pr).length;
    lists[name] = l.map((p, i) => ({ ...dress(p), rank: i + 1, was: fresh ? i + 1 : pr[p.id] || null }));
  }

  // Coins named most across the top meme coin posts.
  const count = new Map();
  for (const p of lists.coin) for (const t of p.tags) count.set(t, (count.get(t) || 0) + 1);
  const named = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([sym, n]) => ({ sym, n, coin: bySym.get(sym) ? lite(bySym.get(sym).address) : null }));

  return { lists, named, counts, mode, every: EVERY, at: refreshedAt || Date.now() };
}
