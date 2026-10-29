import { hasRedis, redis } from './pool';
import { getDexCandidates, resolveTokens } from './dexscreener';
import { getGeckoCandidates, getTokenImages } from './gecko';
import { loadPool, savePool } from './pool';
import { addHolderShares } from './helius';
import { classify } from './themes';
import { guessType } from './types';
import { addWindows } from './windows';
import { addLaunchDescriptions } from './lore';
import { runnerRules } from './site';
import { getJson } from './http';

// Tokens that show up in pools but are never memecoin runners.
const IGNORE = new Set([
  'chipCAT7vi5CZtbZsn9z7iMPXvFwyAnKz3QFu8XVuHm', // CHIP (USD.AI protocol token)
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
// Filters out broken or fake pairs: a market cap the pool couldn't possibly back, or a move
// no real trading produces (e.g. $15B "cap" on a few thousand dollars of liquidity).
function looksReal(r) {
  const liq = r.liquidity || 0;
  if (liq < 2000) return false;
  if (r.marketCap > 0 && r.marketCap / liq > 300) return false;
  if (r.marketCap > 2e9 && liq < 2e6) return false;
  const h24 = r.change?.h24;
  if (typeof h24 === 'number' && h24 > 500000) return false; // more than 5,000x in a day
  return true;
}

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
    if (!looksReal(r)) continue;
    // Stablecoins, wrapped and yield tokens aren't memecoin runners (a "USD"-style token can
    // dwarf the whole field's market cap and skew every stat).
    if (/^(usd|eur|w?btc|w?eth|st|jito|m|b|j|inf)?(usd|sol)[a-z0-9.]*$/i.test(r.symbol) && /usd|stable|dollar|staked|wrapped|yield/i.test(`${r.name} ${r.symbol}`)) continue;
    if (/\b(usd|stablecoin|dollar)\b/i.test(r.name)) continue; // e.g. USD.AI's CHIP: a protocol token, not a meme
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
  // If the market data came back thin (a source outage or rate limit), show the last good
  // board instead of an empty page. Its live numbers still update in the browser.
  if (picked.length < MIN_GOOD) {
    const last = await loadLastGood();
    if (last && last.runners.length > picked.length) {
      console.warn(`[runners] only ${picked.length} resolved (${pairs.size} pairs from ${lookup.length} candidates); using the last good board`);
      return { ...last, stale: true };
    }
  }

  const safe = async (fn, list) => {
    try { return await fn(list); } catch (e) { console.warn('[runners]', fn.name, e.message); return list; }
  };
  picked = await safe(addHolderShares, picked);
  picked = await safe(addWindows, picked);
  picked = await safe(addLaunchDescriptions, picked);
  // Last resort for a logo: GeckoTerminal's copy (one call for every coin still missing one).
  const noLogo = picked.filter((r) => !r.image).map((r) => r.address);
  if (noLogo.length) {
    const imgs = await getTokenImages(noLogo).catch(() => new Map());
    picked = picked.map((r) => (r.image ? r : { ...r, image: imgs.get(r.address) || '' }));
  }
  // And pump.fun's own record, for pump.fun coins still without one (a few per refresh).
  const pumpNoLogo = picked.filter((r) => !r.image && /pump$/.test(r.address)).slice(0, 6);
  if (pumpNoLogo.length) {
    const found = await Promise.all(pumpNoLogo.map((r) => getJson(`https://frontend-api-v3.pump.fun/coins/${r.address}`, { revalidate: 86400, timeoutMs: 5000 })));
    const imgs = new Map(pumpNoLogo.map((r, i) => [r.address, found[i]?.image_uri]).filter(([, u]) => typeof u === 'string' && /^https:\/\//.test(u)));
    picked = picked.map((r) => (r.image ? r : { ...r, image: imgs.get(r.address) || '' }));
  }

  // "Also running": the next-biggest coins that came close (smaller cap or thinner liquidity),
  // so the field can show full, even rows. Shown only on the field, never ranked as runners.
  const pickedSet = new Set(picked.map((r) => r.address));
  const spare = keep.filter((r) => !pickedSet.has(r.address) && r.liquidity >= runnerRules.minLiquidity / 2);
  // Fill to 50 where possible, and always to a whole number of rows of 10.
  const total = Math.floor(Math.min(50, Math.max(picked.length, picked.length + spare.length)) / 10) * 10;
  let alsoRunning = spare.slice(0, Math.max(0, total - picked.length));
  if (alsoRunning.length) {
    alsoRunning = await safe(addLaunchDescriptions, alsoRunning);
    alsoRunning = alsoRunning.map((r) => ({ address: r.address, name: r.name, symbol: r.symbol, image: r.image, change: r.change, marketCap: r.marketCap, theme: r.theme, extra: true }));
  }

  const out = {
    runners: picked,
    alsoRunning,
    windowHours,
    scanned: pairs.size,
    sources: { dexscreener: profiles.size > 0 || pairs.size > 0, geckoterminal: gecko.size > 0 },
    updatedAt: now,
  };
  if (picked.length >= MIN_GOOD) await saveLastGood(out);
  return out;
}

const MIN_GOOD = 10;
const LAST_KEY = 'consensus:runners:last';
let lastMemory = null;

async function loadLastGood() {
  if (hasRedis()) {
    try {
      const [r] = await redis([['GET', LAST_KEY]]);
      if (r?.result) return JSON.parse(r.result);
    } catch {}
  }
  return lastMemory;
}

async function saveLastGood(v) {
  lastMemory = v;
  if (hasRedis()) {
    try { await redis([['SET', LAST_KEY, JSON.stringify(v), 'EX', 7 * 24 * 3600]]); } catch {}
  }
}
