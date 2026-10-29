// The Buzz score (0-100): how much attention a coin is getting right now, from what can be
// measured live: trading activity, volume against its size, momentum, buy pressure, how
// many people hold it, the promotion behind it, and how crowded its narrative is today.
// Graded against today's other runners (they're all already hot): each part is where this coin
// ranks in today's field, so the day's busiest coin scores near 100 and a middle-of-the-pack
// runner around 50. Pure function so the coin page can recompute it as the numbers move.
const clamp = (x) => Math.max(0, Math.min(100, x));
const logScale = (v, lo, hi) => (v > 0 ? clamp(((Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * 100) : 0);

// Where `v` sits among today's runners, 0-100 (sorted ascending list).
const rank = (list, v) => {
  if (!list?.length || v == null) return null;
  let below = 0;
  for (const x of list) if (x < v) below++; else if (x === v) below += 0.5;
  return clamp((below / list.length) * 100);
};

// The sorted lists `buzz` ranks against, built once from today's runners.
export function buzzField(runners) {
  const sorted = (xs) => xs.filter((x) => typeof x === 'number' && isFinite(x)).sort((a, b) => a - b);
  return {
    trades: sorted(runners.map((r) => (r.buys24h || 0) + (r.sells24h || 0))),
    turnover: sorted(runners.map((r) => (r.marketCap > 0 ? r.volume24h / r.marketCap : null))),
    h1: sorted(runners.map((r) => r.change?.h1)),
    buyShare: sorted(runners.map((r) => (r.buys24h + r.sells24h ? r.buys24h / (r.buys24h + r.sells24h) : null))),
  };
}

export function buzz({ field = null, buys = 0, sells = 0, volume24h = 0, marketCap = 0, h1 = null, h24 = null, holders = null, socials = {}, paidProfile = false, boosts = 0, cto = false, themeCount = 0, heat = null }) {
  const trades = (buys || 0) + (sells || 0);
  const turnover = marketCap > 0 ? volume24h / marketCap : 0;
  const buyShare = trades ? buys / trades : 0.5;
  const parts = [
    { id: 'trades', label: 'Trading activity', weight: 0.24, score: rank(field?.trades, trades) ?? logScale(trades, 300, 60000), detail: `${trades.toLocaleString('en-US')} trades in 24h` },
    { id: 'turnover', label: 'Volume vs size', weight: 0.16, score: rank(field?.turnover, turnover) ?? clamp(turnover * 40), detail: `${turnover >= 10 ? Math.round(turnover) : turnover.toFixed(1)}x its market cap traded in 24h` },
    { id: 'momentum', label: 'Momentum', weight: 0.16, score: h1 == null ? 50 : rank(field?.h1, h1) ?? clamp(50 + h1 * 1.2), detail: h1 == null ? 'No 1h number yet' : `${h1 >= 0 ? '+' : ''}${h1.toFixed(1)}% in the last hour` },
    { id: 'pressure', label: 'Buy pressure', weight: 0.12, score: rank(field?.buyShare, buyShare) ?? clamp((buyShare - 0.4) * 500), detail: `${Math.round(buyShare * 100)}% of trades are buys` },
  ];
  if (holders != null) parts.push({ id: 'holders', label: 'Holders', weight: 0.12, score: logScale(holders, 50, 5000), detail: `${holders.toLocaleString('en-US')}${holders >= 10000 ? '+' : ''} wallets hold it` });
  const promo = (socials.x ? 45 : 0) + (socials.website ? 15 : 0) + (socials.telegram ? 10 : 0) + (paidProfile ? 20 : 0) + Math.min(25, (boosts || 0) * 2.5) + (cto ? 20 : 0);
  parts.push({
    id: 'promo', label: 'Socials and promotion', weight: 0.1, score: clamp(promo),
    detail: [socials.x && 'X account', socials.website && 'website', socials.telegram && 'Telegram', paidProfile && 'paid DexScreener profile', boosts > 0 && `${boosts} boosts`, cto && 'community takeover'].filter(Boolean).join(', ') || 'No socials listed',
  });
  const heatBonus = heat === 'rising' ? 30 : heat === 'cooling' ? -20 : 0;
  parts.push({
    id: 'crowd', label: 'Narrative crowd', weight: 0.1, score: clamp(themeCount * 14 + heatBonus + 30),
    detail: `${themeCount} other ${themeCount === 1 ? 'runner' : 'runners'} in its theme${heat ? `, narrative ${heat}` : ''}`,
  });
  const total = parts.reduce((t, p) => t + p.weight, 0);
  const score = Math.round(parts.reduce((t, p) => t + p.score * p.weight, 0) / total);
  const label = score >= 75 ? 'On fire' : score >= 60 ? 'Hot' : score >= 40 ? 'Warm' : score >= 25 ? 'Quiet' : 'Cold';
  return { score, label, parts: parts.map((p) => ({ ...p, score: Math.round(p.score) })) };
}
