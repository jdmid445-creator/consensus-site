// The Buzz score (0-100): how much attention a coin is getting right now, from what can be
// measured live: trading activity, volume against its size, momentum, buy pressure, how
// many people hold it, the promotion behind it, and how crowded its narrative is today.
// Pure function so the coin page can recompute it in the browser as the numbers move.
const clamp = (x) => Math.max(0, Math.min(100, x));
const logScale = (v, lo, hi) => (v > 0 ? clamp(((Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * 100) : 0);

export function buzz({ buys = 0, sells = 0, volume24h = 0, marketCap = 0, h1 = null, h24 = null, holders = null, socials = {}, paidProfile = false, boosts = 0, cto = false, themeCount = 0, heat = null }) {
  const trades = (buys || 0) + (sells || 0);
  const turnover = marketCap > 0 ? volume24h / marketCap : 0;
  const buyShare = trades ? buys / trades : 0.5;
  const parts = [
    { id: 'trades', label: 'Trading activity', weight: 0.24, score: logScale(trades, 300, 60000), detail: `${trades.toLocaleString('en-US')} trades in 24h` },
    { id: 'turnover', label: 'Volume vs size', weight: 0.16, score: clamp(turnover * 40), detail: `${turnover >= 10 ? Math.round(turnover) : turnover.toFixed(1)}x its market cap traded in 24h` },
    { id: 'momentum', label: 'Momentum', weight: 0.16, score: h1 == null ? 50 : clamp(50 + h1 * 1.2), detail: h1 == null ? 'No 1h number yet' : `${h1 >= 0 ? '+' : ''}${h1.toFixed(1)}% in the last hour` },
    { id: 'pressure', label: 'Buy pressure', weight: 0.12, score: clamp((buyShare - 0.4) * 500), detail: `${Math.round(buyShare * 100)}% of trades are buys` },
  ];
  if (holders != null) parts.push({ id: 'holders', label: 'Holders', weight: 0.12, score: logScale(holders, 100, 10000), detail: `${holders.toLocaleString('en-US')}${holders >= 10000 ? '+' : ''} wallets hold it` });
  const promo = (socials.x ? 30 : 0) + (socials.website ? 15 : 0) + (socials.telegram ? 10 : 0) + (paidProfile ? 20 : 0) + Math.min(25, (boosts || 0) * 2.5) + (cto ? 15 : 0);
  parts.push({
    id: 'promo', label: 'Socials and promotion', weight: 0.1, score: clamp(promo),
    detail: [socials.x && 'X account', socials.website && 'website', socials.telegram && 'Telegram', paidProfile && 'paid DexScreener profile', boosts > 0 && `${boosts} boosts`, cto && 'community takeover'].filter(Boolean).join(', ') || 'No socials listed',
  });
  const heatBonus = heat === 'rising' ? 30 : heat === 'cooling' ? -20 : 0;
  parts.push({
    id: 'crowd', label: 'Narrative crowd', weight: 0.1, score: clamp(themeCount * 12 + heatBonus + 10),
    detail: `${themeCount} other ${themeCount === 1 ? 'runner' : 'runners'} in its theme${heat ? `, narrative ${heat}` : ''}`,
  });
  const total = parts.reduce((t, p) => t + p.weight, 0);
  const score = Math.round(parts.reduce((t, p) => t + p.score * p.weight, 0) / total);
  const label = score >= 80 ? 'On fire' : score >= 65 ? 'Hot' : score >= 45 ? 'Warm' : score >= 25 ? 'Quiet' : 'Cold';
  return { score, label, parts: parts.map((p) => ({ ...p, score: Math.round(p.score) })) };
}
