import { hasRedis, redis } from './pool';
import { usd, gain } from './format';

// The wire: news events worked out by comparing each refresh of the runners with the last.
// Every event is something that actually happened in the data; nothing is written by AI.
//   joined     a coin enters the 50
//   milestone  market cap crosses $1M, $2.5M, $5M, $10M, $25M, $50M, $100M (once per level per day)
//   lead       a new coin takes the lead today (biggest 24h gain with real trading)
//   surge/drop 1h move of +50% / -35% or worse (once an hour per coin)
//   climb      rank improves by 10+ places
const SNAP = 'consensus:snap';
const LIST = 'consensus:wire';
const SEEN = 'consensus:wire:seen';
const KEEP = 200;
const LEVELS = [1e6, 2.5e6, 5e6, 1e7, 2.5e7, 5e7, 1e8];

const mem = { snap: null, list: [], seen: new Map() };

function snapOf(runners, lead) {
  return {
    at: Date.now(),
    lead,
    coins: Object.fromEntries(runners.map((r) => [r.address, { cap: r.marketCap, rank: r.rank }])),
  };
}

function ev(type, r, text, extra = {}) {
  return {
    id: `${type}:${r.address}:${Date.now()}`,
    at: Date.now(),
    type,
    address: r.address,
    name: r.name,
    symbol: r.symbol,
    image: r.image,
    text,
    ...extra,
  };
}

function diff(prev, runners, lead) {
  const out = [];
  if (!prev) return out;
  for (const r of runners) {
    const p = prev.coins[r.address];
    if (!p) {
      out.push({ e: ev('joined', r, `joins the runners at ${usd(r.marketCap)}, ${gain(r.change.h24)} on the day`), key: `joined:${r.address}`, ttl: 6 * 3600 });
      continue;
    }
    const crossed = LEVELS.filter((l) => p.cap < l && r.marketCap >= l).pop();
    if (crossed) out.push({ e: ev('milestone', r, `crosses ${usd(crossed)} in market cap`, { level: crossed }), key: `ms:${crossed}:${r.address}`, ttl: 24 * 3600 });
    if (p.rank - r.rank >= 10) out.push({ e: ev('climb', r, `climbs from #${p.rank} to #${r.rank} by market cap`), key: `climb:${r.address}`, ttl: 3600 });
  }
  for (const r of runners) {
    const h1 = r.change.h1;
    if (h1 != null && h1 >= 50) out.push({ e: ev('surge', r, `up ${gain(h1).replace('+', '')} in the last hour`), key: `surge:${r.address}`, ttl: 3600 });
    if (h1 != null && h1 <= -35) out.push({ e: ev('drop', r, `down ${Math.abs(Math.round(h1))}% in the last hour`), key: `drop:${r.address}`, ttl: 3600 });
  }
  // Don't flood the wire when many coins join at once (e.g. right after a quiet spell):
  // keep the 8 biggest newcomers.
  const joined = out.filter((c) => c.e.type === 'joined');
  if (joined.length > 8) {
    const keep = new Set(joined.sort((a, b) => (runners.find((r) => r.address === b.e.address)?.marketCap || 0) - (runners.find((r) => r.address === a.e.address)?.marketCap || 0)).slice(0, 8));
    for (let i = out.length - 1; i >= 0; i--) if (out[i].e.type === 'joined' && !keep.has(out[i])) out.splice(i, 1);
  }
  if (lead && prev.lead && lead !== prev.lead) {
    const r = runners.find((x) => x.address === lead);
    if (r) out.push({ e: ev('lead', r, `takes the lead today, ${gain(r.change.h24)} in 24 hours`), key: `lead:${r.address}`, ttl: 3 * 3600 });
  }
  return out;
}

// Called once per runner refresh. Compares with the previous snapshot (if it's 2 minutes to
// 2 hours old), records new events, and stores the new snapshot.
export async function recordWire(runners, lead) {
  if (!runners.length) return;
  const next = snapOf(runners, lead);
  if (hasRedis()) {
    try {
      const [snapRes] = await redis([['GET', SNAP]]);
      const prev = snapRes?.result ? JSON.parse(snapRes.result) : null;
      const age = prev ? Date.now() - prev.at : Infinity;
      if (prev && age < 2 * 60 * 1000) return; // another refresh just ran
      const candidates = age < 2 * 3600 * 1000 ? diff(prev, runners, lead) : [];
      const fresh = [];
      if (candidates.length) {
        // one-time keys so the same event isn't reported twice (SET NX with an expiry)
        const res = await redis(candidates.map((c) => ['SET', `${SEEN}:${c.key}`, '1', 'NX', 'EX', c.ttl]));
        candidates.forEach((c, i) => { if (res[i]?.result === 'OK') fresh.push(c.e); });
      }
      const cmds = [['SET', SNAP, JSON.stringify(next), 'EX', 6 * 3600]];
      if (fresh.length) cmds.push(['LPUSH', LIST, ...fresh.map((e) => JSON.stringify(e))], ['LTRIM', LIST, 0, KEEP - 1]);
      await redis(cmds);
      return;
    } catch (e) {
      console.warn('[wire] redis failed, using memory:', e.message);
    }
  }
  const prev = mem.snap;
  const age = prev ? Date.now() - prev.at : Infinity;
  if (prev && age < 2 * 60 * 1000) return;
  const now = Date.now();
  for (const [k, until] of mem.seen) if (until < now) mem.seen.delete(k);
  const fresh = (age < 2 * 3600 * 1000 ? diff(prev, runners, lead) : [])
    .filter((c) => !mem.seen.has(c.key))
    .map((c) => { mem.seen.set(c.key, now + c.ttl * 1000); return c.e; });
  mem.list = [...fresh, ...mem.list].slice(0, KEEP);
  mem.snap = next;
}

export async function getWire(limit = 30) {
  if (hasRedis()) {
    try {
      const [res] = await redis([['LRANGE', LIST, 0, limit - 1]]);
      return (res?.result || []).map((s) => JSON.parse(s));
    } catch (e) {
      console.warn('[wire] read failed:', e.message);
    }
  }
  return mem.list.slice(0, limit);
}
