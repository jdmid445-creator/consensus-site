// Daily games built from today's runners. The day is the US Eastern date, so everyone gets the
// same puzzles and they change at midnight ET. Answers are only lightly hidden (it's a game).
import { typeById } from './types';
import { age } from './format';

export const gameDay = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

// Small seeded random so picks are the same all day.
function rng(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hide = (s) => Buffer.from(String(s).split('').reverse().join('')).toString('base64');
const shuffle = (xs, r) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function buildGames(runners, themes) {
  const day = gameDay();
  const r = rng(day);
  const themeName = new Map((themes || []).map((t) => [t.id, t.name]));
  const pool = runners.filter((x) => x.image);

  // 1. Daily ticker: a 3-7 letter ticker.
  const tickerable = runners.filter((x) => /^[A-Za-z]{3,7}$/.test(x.symbol));
  const t = tickerable.length ? tickerable[Math.floor(r() * tickerable.length)] : null;
  const ticker = t && {
    code: hide(t.symbol.toUpperCase()),
    coin: { address: t.address, name: t.name, image: t.image },
    clues: [
      `Theme: ${themeName.get(t.theme) || 'a one-off'}`,
      `Type: ${typeById(t.type).name}, launched on ${t.launchpad}`,
      `About ${age(t.ageHours)} old`,
      `It starts with ${t.symbol[0].toUpperCase()}`,
    ],
  };

  // 2. Jumble: unscramble a runner's name (one or two words, letters only).
  const jumbleable = runners.filter((x) => /^[A-Za-z]{4,10}( [A-Za-z]{3,10})?$/.test(x.name.trim()));
  const j = jumbleable.length ? jumbleable[Math.floor(r() * jumbleable.length)] : null;
  let jumble = null;
  if (j) {
    const words = j.name.trim().toUpperCase().split(' ');
    const scrambled = words.map((w) => { let s = w; for (let k = 0; k < 6 && s === w; k++) s = shuffle(w.split(''), r).join(''); return s; });
    jumble = { scrambled, code: hide(words.join(' ')), coin: { address: j.address, name: j.name, image: j.image, symbol: j.symbol }, hint: `$${j.symbol[0]}${'•'.repeat(Math.max(0, j.symbol.length - 1))}, ${themeName.get(j.theme) || 'a one-off'}` };
  }

  // 3. Higher or lower: ten pairs, which has the bigger market cap?
  const hl = [];
  const order = shuffle(runners, r);
  for (let i = 0; i + 1 < order.length && hl.length < 10; i += 2) {
    const a = order[i], b = order[i + 1];
    if (!a.marketCap || !b.marketCap || a.marketCap === b.marketCap) continue;
    hl.push({ a: { address: a.address, name: a.name, symbol: a.symbol, image: a.image, cap: a.marketCap }, b: { address: b.address, name: b.name, symbol: b.symbol, image: b.image, cap: b.marketCap } });
  }

  // 4. Name that logo: a logo and four names.
  const logos = [];
  const lp = shuffle(pool, r);
  for (let i = 0; i < lp.length && logos.length < 6; i++) {
    const right = lp[i];
    const wrong = shuffle(runners.filter((x) => x.address !== right.address), r).slice(0, 3);
    if (wrong.length < 3) break;
    logos.push({ image: right.image, address: right.address, options: shuffle([right, ...wrong], r).map((x) => ({ id: x.address, label: x.name })) , answer: hide(right.address) });
  }

  return { day, ticker, jumble, hl, logos };
}
