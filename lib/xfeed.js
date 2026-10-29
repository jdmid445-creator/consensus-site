import { getJson } from './http';

// The X tracker: recent posts about today's runners. Works with either the official X API
// (X_BEARER_TOKEN) or twitterapi.io (TWITTERAPI_IO_KEY). With neither set, the tab stays hidden.
// Results are cached for X_FEED_SECONDS (default 300) because every read costs API credits.

export const xFeedEnabled = () => Boolean(process.env.X_BEARER_TOKEN || process.env.TWITTERAPI_IO_KEY);
const TTL = Number(process.env.X_FEED_SECONDS || 300);

const unescape = (t) => (t || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const okSym = (s) => /^[A-Za-z][A-Za-z0-9_]{1,14}$/.test(s || '');

// Cashtags for the most traded runners, as many as fit in one query.
function buildQuery(runners, rt) {
  const syms = [];
  for (const r of [...runners].sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0))) {
    if (!okSym(r.symbol) || syms.includes(r.symbol.toUpperCase())) continue;
    syms.push(r.symbol.toUpperCase());
    if (syms.length >= 16) break;
  }
  if (!syms.length) return null;
  return `(${syms.map((s) => `$${s}`).join(' OR ')}) ${rt}`;
}

async function viaX(runners) {
  const q = buildQuery(runners, '-is:retweet');
  if (!q) return [];
  const u = new URL('https://api.x.com/2/tweets/search/recent');
  u.searchParams.set('query', q);
  u.searchParams.set('max_results', '100');
  u.searchParams.set('tweet.fields', 'created_at,public_metrics');
  u.searchParams.set('expansions', 'author_id');
  u.searchParams.set('user.fields', 'username,name,profile_image_url,public_metrics,verified');
  const j = await getJson(u.toString(), { headers: { authorization: `Bearer ${process.env.X_BEARER_TOKEN}` }, revalidate: TTL, timeoutMs: 10000 });
  if (!j?.data) return [];
  const users = new Map((j.includes?.users || []).map((x) => [x.id, x]));
  return j.data.map((t) => {
    const a = users.get(t.author_id) || {};
    return {
      id: t.id,
      text: t.text,
      createdAt: t.created_at,
      likes: t.public_metrics?.like_count || 0,
      reposts: t.public_metrics?.retweet_count || 0,
      replies: t.public_metrics?.reply_count || 0,
      author: {
        handle: a.username || '',
        name: a.name || a.username || '',
        avatar: (a.profile_image_url || '').replace('_normal', '_bigger'),
        followers: a.public_metrics?.followers_count || 0,
        verified: Boolean(a.verified),
      },
      url: `https://x.com/${a.username || 'i'}/status/${t.id}`,
    };
  });
}

async function viaTwitterApiIo(runners) {
  const q = buildQuery(runners, '-filter:retweets');
  if (!q) return [];
  const out = [];
  let cursor = '';
  for (let page = 0; page < 3; page++) {
    const u = new URL(`${process.env.TWITTERAPI_IO_BASE || 'https://api.twitterapi.io'}/twitter/tweet/advanced_search`);
    u.searchParams.set('query', q);
    u.searchParams.set('queryType', 'Latest');
    if (cursor) u.searchParams.set('cursor', cursor);
    const j = await getJson(u.toString(), { headers: { 'x-api-key': process.env.TWITTERAPI_IO_KEY }, revalidate: TTL, timeoutMs: 10000 });
    if (!j?.tweets?.length) break;
    for (const t of j.tweets) {
      const a = t.author || {};
      out.push({
        id: t.id,
        text: t.text,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
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
      });
    }
    if (!j.has_next_page || !j.next_cursor) break;
    cursor = j.next_cursor;
  }
  return out;
}

// Which runners a post is about: cashtags and contract addresses in its text.
function tagCoins(text, bySym, byAddr) {
  const hits = new Set();
  for (const m of text.matchAll(/\$([A-Za-z][A-Za-z0-9_]{1,14})/g)) {
    const r = bySym.get(m[1].toUpperCase());
    if (r) hits.add(r.address);
  }
  for (const m of text.matchAll(/[1-9A-HJ-NP-Za-km-z]{32,44}/g)) if (byAddr.has(m[0])) hits.add(m[0]);
  return [...hits];
}

export async function getXFeed(runners) {
  if (!xFeedEnabled() || !runners?.length) return null;
  const raw = process.env.X_BEARER_TOKEN ? await viaX(runners) : await viaTwitterApiIo(runners);
  const bySym = new Map();
  for (const r of runners) if (okSym(r.symbol) && !bySym.has(r.symbol.toUpperCase())) bySym.set(r.symbol.toUpperCase(), r);
  const byAddr = new Map(runners.map((r) => [r.address, r]));

  const seen = new Set();
  const posts = [];
  for (const p of raw) {
    if (!p.id || seen.has(p.id) || !p.text) continue;
    seen.add(p.id);
    const coins = tagCoins(p.text, bySym, byAddr);
    if (!coins.length) continue;
    // Shilling bots post a wall of cashtags; skip anything tagging more than four runners.
    if ((p.text.match(/\$[A-Za-z]/g) || []).length > 4) continue;
    posts.push({ ...p, text: unescape(p.text), coins });
  }
  posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Per coin: posts, distinct accounts, combined reach.
  const talk = new Map();
  for (const p of posts) {
    for (const a of p.coins) {
      const t = talk.get(a) || { address: a, posts: 0, accounts: new Set(), reach: 0, likes: 0 };
      t.posts++;
      if (!t.accounts.has(p.author.handle)) { t.accounts.add(p.author.handle); t.reach += p.author.followers; }
      t.likes += p.likes;
      talk.set(a, t);
    }
  }
  const coins = [...talk.values()]
    .map((t) => ({ address: t.address, posts: t.posts, accounts: t.accounts.size, reach: t.reach, likes: t.likes }))
    .sort((a, b) => b.accounts - a.accounts || b.reach - a.reach);

  // The biggest accounts talking, one row each.
  const authors = new Map();
  for (const p of posts) {
    const k = p.author.handle;
    const a = authors.get(k) || { ...p.author, posts: 0, coins: new Set() };
    a.posts++;
    p.coins.forEach((c) => a.coins.add(c));
    authors.set(k, a);
  }
  const loudest = [...authors.values()]
    .sort((a, b) => b.followers - a.followers)
    .slice(0, 10)
    .map((a) => ({ ...a, coins: [...a.coins] }));

  return { posts: posts.slice(0, 60), coins, loudest, at: new Date().toISOString() };
}
