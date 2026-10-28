import { getDexCandidates, resolveTokens } from './dexscreener';
import { getGeckoCandidates } from './gecko';
import { loadPool, savePool } from './pool';
import { addHolderShares } from './helius';
import { classify } from './themes';
import { guessType } from './types';
import { addWindows } from './windows';
import { addLaunchDescriptions } from './lore';
import { runnerRules } from './site';

// Tokens that show up in pools but are never memecoin runners.
const IGNORE = new Set([
  'So11111111111111111111111111111111111111112', // wSOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', // WIF
]);

function launchpadOf(address, dexId) {
  const a = address.toLowerCase();
  if (a.endsWith('pump') || dexId === 'pumpswap' || dexId === 'pumpfun') return 'pump.fun';
  if (a.endsWith('bonk')) return 'Bonk.fun';
  if (a.endsWith('bags')) return 'Bags';
  if (dexId === 'launchlab') return 'LaunchLab';
  if (dexId === 'meteora' || dexId === 'meteoradbc') return 'Meteora';
  if (dexId === 'raydium') return 'Raydium';
  return dexId || 'Other';
}

function socialsOf(pair, profile) {
  const out = { x: '', telegram: '', website: '' };
  const all = [
    ...(pair.info?.socials || []).map((s) => ({ type: s.type, url: s.url })),
    ...(pair.info?.websites || []).map((w) => ({ type: 'website', url: w.url })),
    ...(profile?.links || []).map((l) => ({ type: l.type || (l.label || '').toLowerCase() || 'website', url: l.url })),
  ];
  for (const { type, url } of all) {
    if (!url || typeof url !== 'string' || !/^https?:\/\//.test(url)) continue;
    const t = (type || '').toLowerCase();
    if (!out.x && (t === 'twitter' || t === 'x' || /\/\/(www\.)?(x|twitter)\.com\//.test(url))) out.x = url;
    else if (!out.telegram && (t === 'telegram' || /t\.me\//.test(url))) out.telegram = url;
    else if (!out.website && (t === 'website' || t === '')) out.website = url;
  }
  return out;
}

function toRunner(pair, profile, now) {
  const createdAt = pair.pairCreatedAt || 0;
  const address = pair.baseToken.address;
  const r = {
    address,
    name: (pair.baseToken.name || '').trim().slice(0, 60),
    symbol: (pair.baseToken.symbol || '').trim().slice(0, 20),
    image: pair.info?.imageUrl || profile?.icon || '',
    description: (profile?.description || '').trim().slice(0, 400),
    url: pair.url || `https://dexscreener.com/solana/${pair.pairAddress}`,
    pairAddress: pair.pairAddress,
    dex: pair.dexId || '',
    launchpad: launchpadOf(address, pair.dexId),
    marketCap: pair.marketCap || pair.fdv || 0,
    liquidity: pair.liquidity?.usd || 0,
    liquidityBase: Number(pair.liquidity?.base) || 0, // the coin's own tokens sitting in the pool
    priceUsd: Number(pair.priceUsd) || 0,
    change: { m5: pair.priceChange?.m5 ?? null, h1: pair.priceChange?.h1 ?? null, h6: pair.priceChange?.h6 ?? null, h24: pair.priceChange?.h24 ?? null },
    volume: { h1: pair.volume?.h1 ?? null, h6: pair.volume?.h6 ?? null, h24: pair.volume?.h24 ?? null },
    volume24h: pair.volume?.h24 || 0,
    buys24h: pair.txns?.h24?.buys || 0,
    sells24h: pair.txns?.h24?.sells || 0,
    createdAt,
    ageHours: createdAt ? (now - createdAt) / 3600000 : null,
    socials: socialsOf(pair, profile),
    paidProfile: Boolean(profile?.profile),
    boosts: pair.boosts?.active || 0,
  };
  r.theme = classify(r);
  r.type = guessType({ ...r, cto: profile?.cto });
  r.cto = Boolean(profile?.cto);
  return r;
}

// The last 50 runners: the biggest Solana memecoins by market cap that launched in the
// last 72 hours (window widens to 5, then 7 days if fewer than 50 qualify). Every number
// comes from DexScreener at request time. Nothing here is estimated or filled in.
export async function getRunners() {
  const now = Date.now();
  const [profiles, gecko] = await Promise.all([getDexCandidates(), getGeckoCandidates()]);
  const remembered = await loadPool();
  const lookup = [...new Set([...profiles.keys(), ...gecko, ...remembered])].filter((a) => !IGNORE.has(a));
  const pairs = await resolveTokens(lookup);

  const maxAge = Math.max(...runnerRules.windows);
  const all = [];
  const keep = [];
  for (const [addr, pair] of pairs) {
    const r = toRunner(pair, profiles.get(addr), now);
    if (!r.createdAt || r.ageHours > maxAge) continue;
    // remember anything within reach of qualifying so it can be tracked as it runs
    if (r.marketCap >= runnerRules.minMarketCap / 3) keep.push(r);
    if (r.marketCap < runnerRules.minMarketCap || r.liquidity < runnerRules.minLiquidity) continue;
    all.push(r);
  }
  keep.sort((a, b) => b.marketCap - a.marketCap);
  // Only overwrite the memory when the lookup actually worked, so an outage can't wipe it.
  if (pairs.size > 0) await savePool(keep.map((r) => r.address));

  let windowHours = runnerRules.windows[0] || 72;
  let picked = [];
  for (const w of runnerRules.windows) {
    windowHours = w;
    picked = all.filter((r) => r.ageHours <= w);
    if (picked.length >= runnerRules.count) break;
  }
  picked.sort((a, b) => b.marketCap - a.marketCap);
  picked = picked.slice(0, runnerRules.count).map((r, i) => ({ ...r, rank: i + 1 }));
  picked = await addHolderShares(picked);
  picked = await addWindows(picked);
  picked = await addLaunchDescriptions(picked);

  return {
    runners: picked,
    windowHours,
    scanned: pairs.size,
    sources: { dexscreener: profiles.size > 0 || pairs.size > 0, geckoterminal: gecko.size > 0 },
    updatedAt: now,
  };
}
