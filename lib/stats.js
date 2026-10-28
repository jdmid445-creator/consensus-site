import { THEMES, OTHER } from './themes';

const median = (xs) => {
  const v = xs.filter((x) => typeof x === 'number' && isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};
const share = (n, d) => (d ? n / d : 0);

// Plain counts over the runner set. These are facts, not AI output.
export function computeStats(runners) {
  const n = runners.length;
  const totalCap = runners.reduce((s, r) => s + r.marketCap, 0);

  const themes = [...THEMES, OTHER]
    .map((t) => {
      const rs = runners.filter((r) => r.theme === t.id);
      const cap = rs.reduce((s, r) => s + r.marketCap, 0);
      return {
        id: t.id, name: t.name, color: t.color,
        count: rs.length,
        shareCount: share(rs.length, n),
        shareCap: share(cap, totalCap),
        medianChange24h: median(rs.map((r) => r.change.h24)),
        addresses: rs.map((r) => r.address),
      };
    })
    .filter((t) => t.count > 0)
    .sort((a, b) => b.shareCap - a.shareCap);

  const pads = new Map();
  for (const r of runners) pads.set(r.launchpad, (pads.get(r.launchpad) || 0) + 1);
  const launchpads = [...pads].map(([name, count]) => ({ name, count, share: share(count, n) })).sort((a, b) => b.count - a.count);

  const byChange = [...runners].filter((r) => r.change.h24 != null).sort((a, b) => b.change.h24 - a.change.h24);

  return {
    count: n,
    totalCap,
    medianCap: median(runners.map((r) => r.marketCap)),
    medianAgeHours: median(runners.map((r) => r.ageHours)),
    medianVolume: median(runners.map((r) => r.volume24h)),
    withX: share(runners.filter((r) => r.socials.x).length, n),
    withSite: share(runners.filter((r) => r.socials.website).length, n),
    withTelegram: share(runners.filter((r) => r.socials.telegram).length, n),
    paidProfile: share(runners.filter((r) => r.paidProfile).length, n),
    buyShare: share(runners.reduce((s, r) => s + r.buys24h, 0), runners.reduce((s, r) => s + r.buys24h + r.sells24h, 0)),
    launchpads,
    themes,
    topMover: byChange[0]?.address || null,
    largest: runners[0]?.address || null,
  };
}
