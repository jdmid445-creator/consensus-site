import { hasRedis, redis } from './pool';
import { unescape, okSym, buildQuery, watchQueries, GENERAL_SET, CRYPTO, important, tagCoins } from './xfeed';

// The live X tracker. Every few seconds (at most once per X_POLL_SECONDS across all
// visitors, enforced with a Redis lock) it asks twitterapi.io only for posts newer than the
// last one it saw, so each check costs the minimum unless there is something new.
// New posts are kept in Redis (newest 400) and every visitor reads from there.

const POLL = Math.max(2, Number(process.env.X_POLL_SECONDS || 5));
const BASE = () => process.env.TWITTERAPI_IO_BASE || 'https://api.twitterapi.io';
const K = { posts: 'x:live:posts', since: 'x:live:since', lock: 'x:live:lock' };
const KEEP = 400;
let mem = { posts: [], since: {}, lockUntil: 0 };

export const xLiveEnabled = () => Boolean(process.env.TWITTERAPI_IO_KEY);

// Call-group shills, paid promos and bots: the noise j7-style trackers keep out.
const PROMO = /copy ?trad|private (tg|telegram|group)|prvt|alpha tg|tg me|dm for|join (my|our) (tg|telegram)|\b\d{2,5}x\b|my call|early gems?|\bgems?\b|now buy|we are shilling|shilling now|join late|next 100x|send it|ca\s*>+|#(solana)?memecoins?\b|#fomo|giveaway|whitelist|via tg\b/i;
const BOTLIKE = /bot\b|alert|trending|tracker|scanner|sniper|calls?\b|signals?/i;

function norm(t) {
  const a = t.author || {};
  const q = t.quoted_tweet;
  const r = t.retweeted_tweet;
  const media = t.extendedEntities?.media || t.entities?.media || [];
  const img = media.find((m) => m.media_url_https)?.media_url_https || null;
  const type = r ? 'repost' : q ? 'quote' : t.isReply ? 'reply' : 'post';
  const sub = (x) => x && {
    text: unescape(x.text),
    handle: x.author?.userName || '',
    name: x.author?.name || x.author?.userName || '',
    avatar: x.author?.profilePicture || '',
  };
  return {
    id: String(t.id),
    type,
    text: unescape(r ? r.text : t.text),
    replyTo: t.inReplyToUsername || null,
    quoted: q ? sub(q) : null,
    reposted: r ? sub(r) : null,
    img,
    createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
    likes: t.likeCount || 0,
    reposts: t.retweetCount || 0,
    replies: t.replyCount || 0,
    author: {
      handle: a.userName || '',
      name: a.name || a.userName || '',
      avatar: a.profilePicture || '',
      followers: a.followers || 0,
      verified: Boolean(a.isBlueVerified || a.verified),
    },
    url: t.url || `https://x.com/${a.userName || 'i'}/status/${t.id}`,
  };
}

async function search(query, sinceSec) {
  const u = new URL(`${BASE()}/twitter/tweet/advanced_search`);
  u.searchParams.set('query', `${query} since_time:${sinceSec}`);
  u.searchParams.set('queryType', 'Latest');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
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
  if (!hasRedis()) return { posts: mem.posts, since: mem.since };
  try {
    const [p, s] = await redis([['GET', K.posts], ['GET', K.since]]);
    return { posts: p?.result ? JSON.parse(p.result) : [], since: s?.result ? JSON.parse(s.result) : {} };
  } catch {
    return { posts: mem.posts, since: mem.since };
  }
}

async function lock() {
  if (!hasRedis()) {
    if (Date.now() < mem.lockUntil) return false;
    mem.lockUntil = Date.now() + POLL * 1000;
    return true;
  }
  try {
    const [r] = await redis([['SET', K.lock, '1', 'NX', 'EX', POLL]]);
    return r?.result === 'OK';
  } catch {
    return false;
  }
}

// Text and account checks, applied to new posts and again to stored ones when rules change.
function passes(p, lane) {
  const body = `${p.text} ${p.quoted?.text || ''}`;
  if (lane === 'runners') {
    if (!important(p) || PROMO.test(body)) return false;
    if (BOTLIKE.test(p.author.handle) || BOTLIKE.test(p.author.name)) return false;
    if ((p.text.match(/\$[A-Za-z]/g) || []).length > 4) return false;
    return true;
  }
  return !(GENERAL_SET.has(p.author.handle.toLowerCase()) && !CRYPTO.test(body));
}

// One round of checks. Returns the stored posts afterwards.
async function poll(runners) {
  const state = await load();
  if (!(await lock())) return state.posts;
  const now = Math.floor(Date.now() / 1000);
  const queries = [];
  const rq = buildQuery(runners, '-filter:retweets');
  if (rq) queries.push(['runners', rq]);
  watchQueries('').forEach((q, i) => queries.push([`watch${i}`, q]));

  const bySym = new Map();
  for (const r of runners) if (okSym(r.symbol) && !bySym.has(r.symbol.toUpperCase())) bySym.set(r.symbol.toUpperCase(), r);
  const byAddr = new Map(runners.map((r) => [r.address, r]));

  const results = await Promise.all(queries.map(([name, q]) => search(q, state.since[name] || now - 1800)));
  const have = new Set(state.posts.map((p) => p.id));
  const add = [];
  results.forEach((list, i) => {
    const lane = queries[i][0] === 'runners' ? 'runners' : 'big';
    let newest = state.since[queries[i][0]] || now - 1800;
    for (const p of list) {
      newest = Math.max(newest, Math.floor(new Date(p.createdAt) / 1000));
      if (have.has(p.id)) continue;
      const body = `${p.text} ${p.quoted?.text || ''}`;
      if (!passes(p, lane)) continue;
      const coins = tagCoins(body, bySym, byAddr);
      if (lane === 'runners' && !coins.length) continue;
      if (lane === 'runners') {
        const t = new Date(p.createdAt).getTime();
        const dupe = [...add, ...state.posts].some((o) => o.author.handle === p.author.handle && Math.abs(new Date(o.createdAt) - t) < 30 * 60e3 && (o.coins || []).some((c) => coins.includes(c)));
        if (dupe) continue;
      }
      have.add(p.id);
      add.push({ ...p, lane, coins });
    }
    // Step past the newest post seen so the next check only bills for new ones.
    state.since[queries[i][0]] = newest + 1;
  });
  const posts = [...add, ...state.posts.filter((o) => passes(o, o.lane))].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, KEEP);
  mem = { ...mem, posts, since: state.since };
  if (hasRedis()) {
    try {
      await redis([['SET', K.posts, JSON.stringify(posts), 'EX', 3 * 24 * 3600], ['SET', K.since, JSON.stringify(state.since), 'EX', 3 * 24 * 3600]]);
    } catch {}
  }
  return posts;
}

// What the page needs: the posts plus the two side lists, coins resolved to name/logo.
export async function getXLive(runners) {
  if (!xLiveEnabled() || !runners?.length) return null;
  const posts = await poll(runners);
  const byAddr = new Map(runners.map((r) => [r.address, r]));
  const lite = (a) => { const r = byAddr.get(a); return r ? { address: r.address, name: r.name, symbol: r.symbol, image: r.image } : null; };
  const out = posts.slice(0, 150).map((p) => ({ ...p, coins: (p.coins || []).map(lite).filter(Boolean) }));

  // Side lists from the runner lane over the last six hours.
  const cutoff = Date.now() - 6 * 3600e3;
  const recent = posts.filter((p) => p.lane === 'runners' && new Date(p.createdAt) > cutoff);
  const talk = new Map();
  const authors = new Map();
  for (const p of recent) {
    for (const a of p.coins || []) {
      const t = talk.get(a) || { address: a, posts: 0, accounts: new Set(), reach: 0 };
      t.posts++;
      if (!t.accounts.has(p.author.handle)) { t.accounts.add(p.author.handle); t.reach += p.author.followers; }
      talk.set(a, t);
    }
    if (!authors.has(p.author.handle)) authors.set(p.author.handle, p.author);
  }
  const talked = [...talk.values()]
    .sort((a, b) => b.accounts.size - a.accounts.size || b.reach - a.reach)
    .slice(0, 10)
    .map((t) => ({ address: t.address, posts: t.posts, accounts: t.accounts.size, reach: t.reach, coin: lite(t.address) }))
    .filter((t) => t.coin);
  const loud = [...authors.values()].sort((a, b) => b.followers - a.followers).slice(0, 8);
  return { posts: out, talked, loud, poll: POLL, at: Date.now() };
}
