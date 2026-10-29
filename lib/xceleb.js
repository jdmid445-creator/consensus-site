import { hasRedis, redis } from './pool';
import { unescape } from './xfeed';

// Celebrities who posted in the last 48 hours about something that's running: a post that
// names a running coin, its ticker or its contract address. Checked every 15 minutes.

const EVERY = 15 * 60;
const WINDOW = 48 * 3600;
const BASE = () => process.env.TWITTERAPI_IO_BASE || 'https://api.twitterapi.io';

// Big names whose posts tend to spawn or pump coins. X_CELEBS adds more (comma-separated handles).
const CELEBS = [
  'elonmusk', 'realDonaldTrump', 'POTUS', 'JDVance', 'MrBeast', 'IShowSpeed', 'KSI', 'LoganPaul', 'jakepaul',
  'snoopdogg', 'KimKardashian', 'kanyewest', 'Drake', 'justinbieber', 'ParisHilton', 'Cristiano', 'KingJames',
  'Cobratate', 'joerogan', 'TuckerCarlson', 'mcuban', 'BillGates', 'sama', 'KevinHart4real', 'Mattfurie',
  'xQc', 'Adin', 'kaicenat', 'NikitaBier', 'pmarca', 'naval', 'balajis', 'cz_binance', 'VitalikButerin',
];
const handles = () => [...new Set([...CELEBS, ...(process.env.X_CELEBS || '').split(',').map((h) => h.trim().replace(/^@/, '')).filter(Boolean)])];

// Words too common to count as a coin name on their own.
const COMMON = new Set(['the', 'this', 'that', 'what', 'just', 'coin', 'token', 'meme', 'love', 'life', 'time', 'good', 'best', 'more', 'real', 'live', 'king', 'moon', 'dog', 'cat', 'frog', 'game', 'news', 'money', 'world', 'free', 'baby', 'happy', 'america', 'trump', 'elon', 'today', 'people', 'work', 'next', 'home', 'house', 'big', 'make', 'great', 'first', 'people', 'year', 'never', 'will', 'with', 'from', 'have', 'they', 'your', 'about', 'there', 'their', 'here', 'only', 'very', 'like', 'some', 'into', 'also', 'back', 'than', 'then', 'them', 'over', 'well', 'were', 'when', 'were', 'want', 'been', 'look', 'know', 'going', 'thing', 'things', 'yes', 'nice', 'cool', 'based', 'agent', 'ai']);

let mem = { posts: [], at: 0, lockUntil: 0 };

function matcher(coins) {
  const rules = [];
  for (const c of coins) {
    const sym = (c.symbol || '').trim();
    const name = (c.name || '').trim();
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tests = [new RegExp(`\\$${esc(sym)}\\b`, 'i')];
    if (c.address) tests.push(new RegExp(esc(c.address)));
    // A bare name or ticker counts only when it's distinctive: 4+ letters and not an everyday word.
    if (name.length >= 4 && !COMMON.has(name.toLowerCase())) tests.push(new RegExp(`(^|[^\\w$])${esc(name)}([^\\w]|$)`, 'i'));
    if (sym.length >= 4 && !COMMON.has(sym.toLowerCase()) && sym.toLowerCase() !== name.toLowerCase()) tests.push(new RegExp(`(^|[^\\w$])${esc(sym)}([^\\w]|$)`));
    rules.push({ c, tests });
  }
  return (text) => rules.filter((r) => r.tests.some((t) => t.test(text))).map((r) => r.c);
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
    views: t.viewCount || 0,
    author: { handle: a.userName || '', name: a.name || a.userName || '', avatar: a.profilePicture || '', followers: a.followers || 0 },
    url: t.url || `https://x.com/${a.userName || 'i'}/status/${t.id}`,
  };
}

async function search(query) {
  const u = new URL(`${BASE()}/twitter/tweet/advanced_search`);
  u.searchParams.set('query', query);
  u.searchParams.set('queryType', 'Latest');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(u, { headers: { 'x-api-key': process.env.TWITTERAPI_IO_KEY }, cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) return [];
    const j = await res.json();
    return (j.tweets || []).map(norm);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function load() {
  if (!hasRedis()) return mem;
  try {
    const [r] = await redis([['GET', 'x:celeb']]);
    return r?.result ? JSON.parse(r.result) : { posts: [], at: 0 };
  } catch {
    return mem;
  }
}

async function lock() {
  if (!hasRedis()) {
    if (Date.now() < mem.lockUntil) return false;
    mem.lockUntil = Date.now() + EVERY * 1000;
    return true;
  }
  try {
    const [r] = await redis([['SET', 'x:celeb:lock', '1', 'NX', 'EX', EVERY]]);
    return r?.result === 'OK';
  } catch {
    return false;
  }
}

// Raw recent posts from the celebrity list (kept for 48 hours), refreshed every 15 minutes.
async function refresh() {
  const state = await load();
  if (!(await lock())) return state;
  const since = Math.floor(Date.now() / 1000) - WINDOW;
  const all = handles();
  const qs = [];
  for (let i = 0; i < all.length; i += 12) qs.push(`(${all.slice(i, i + 12).map((h) => `from:${h}`).join(' OR ')}) since_time:${since} -filter:retweets`);
  const lists = await Promise.all(qs.map(search));
  const byId = new Map((state.posts || []).map((p) => [p.id, p]));
  for (const p of lists.flat()) byId.set(p.id, p);
  const cutoff = Date.now() - WINDOW * 1000;
  const posts = [...byId.values()].filter((p) => new Date(p.createdAt).getTime() > cutoff).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 400);
  const next = { posts, at: Date.now() };
  mem = { ...mem, ...next };
  if (hasRedis()) {
    try { await redis([['SET', 'x:celeb', JSON.stringify(next), 'EX', 3 * 24 * 3600]]); } catch {}
  }
  return next;
}

// Only the posts that name something running right now, each with the coins it hit.
export async function getCelebPosts(coins) {
  if (!process.env.TWITTERAPI_IO_KEY || !coins?.length) return { posts: [], at: null };
  const { posts = [], at } = await refresh();
  const match = matcher(coins);
  const out = [];
  for (const p of posts) {
    const hits = match(`${p.text} ${p.quoted?.text || ''}`);
    if (!hits.length) continue;
    out.push({ ...p, coins: hits.slice(0, 3).map((c) => ({ address: c.address, name: c.name, symbol: c.symbol, image: c.image, h24: c.change?.h24 ?? null })) });
  }
  return { posts: out.slice(0, 12), at };
}
