import { getJson, chunk } from './http';

// DexScreener public API. No key. Profiles/boosts: 60 req/min, pairs/tokens: 300 req/min.
const BASE = process.env.DEXSCREENER_BASE || 'https://api.dexscreener.com';

// Tokens that recently paid for a profile, got boosted, or were taken over by their community.
// These are the coins people are actually putting money behind, so they're good runner candidates.
// Returns { address -> { description, links, header, icon, profile } } for Solana tokens.
export async function getDexCandidates() {
  const [profiles, ...rest] = await Promise.all([
    getJson(`${BASE}/token-profiles/latest/v1`),
    getJson(`${BASE}/token-boosts/latest/v1`),
    getJson(`${BASE}/token-boosts/top/v1`),
    getJson(`${BASE}/community-takeovers/latest/v1`),
  ]);
  const out = new Map();
  for (const [i, list] of [profiles, ...rest].entries()) {
    if (!Array.isArray(list)) continue;
    for (const t of list) {
      if (t?.chainId !== 'solana' || !t.tokenAddress) continue;
      const prev = out.get(t.tokenAddress) || {};
      out.set(t.tokenAddress, {
        description: prev.description || t.description || '',
        links: prev.links?.length ? prev.links : Array.isArray(t.links) ? t.links : [],
        header: prev.header || t.header || '',
        icon: prev.icon || t.icon || '',
        profile: Boolean(prev.profile) || i === 0, // paid "enhanced token info"
      });
    }
  }
  return out;
}

// Look up pairs for up to 30 tokens per call and keep each token's most liquid pair.
export async function resolveTokens(addresses) {
  const best = new Map();
  const batches = chunk([...new Set(addresses)], 30);
  const results = await Promise.all(batches.map((b) => getJson(`${BASE}/tokens/v1/solana/${b.join(',')}`)));
  for (const pairs of results) {
    if (!Array.isArray(pairs)) continue;
    for (const p of pairs) {
      const addr = p?.baseToken?.address;
      if (!addr || p.chainId !== 'solana') continue;
      const cur = best.get(addr);
      if (!cur || (p.liquidity?.usd || 0) > (cur.liquidity?.usd || 0)) best.set(addr, p);
    }
  }
  return best;
}
