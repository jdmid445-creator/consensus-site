import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import path from 'path';
import { getMeta } from '@/lib/meta';
import { usd, gain, age } from '@/lib/format';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const font = (w) => readFile(path.join(process.cwd(), 'assets/fonts', `supreme-${w}.ttf`));

// Today's #1 by the same rule as the leader card: biggest 24h gain with real trading behind it.
function leader(runners) {
  const solid = runners.filter((r) => typeof r.change?.h24 === 'number' && r.volume24h >= 50_000 && r.liquidity >= 15_000);
  return [...(solid.length ? solid : runners)].sort((a, b) => (b.change?.h24 ?? -1e9) - (a.change?.h24 ?? -1e9))[0];
}

async function logoData(url) {
  if (!url) return null;
  try {
    const u = url.replace('format=auto', 'format=png');
    const res = await fetch(u, { headers: { accept: 'image/png,image/jpeg' }, signal: AbortSignal.timeout(6000) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !/png|jpe?g/.test(type)) return null;
    return `data:${type.split(';')[0]};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
  } catch {
    return null;
  }
}

// A square share card for a coin (?a=address), or today's #1 when no address is given.
// Live numbers come straight from DexScreener at the moment the card is made.
export async function GET(req) {
  const a = new URL(req.url).searchParams.get('a');
  const meta = await getMeta();
  const all = [...meta.runners, ...(meta.alsoRunning || [])];
  // Live numbers for every runner, so "#1" here is the same coin the site's leader card shows.
  const liveBy = new Map();
  for (let i = 0; i < meta.runners.length; i += 30) {
    try {
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${meta.runners.slice(i, i + 30).map((x) => x.address).join(',')}`, { signal: AbortSignal.timeout(6000), cache: 'no-store' });
      for (const p of res.ok ? await res.json() : []) {
        const k = p.baseToken?.address;
        if (k && (!liveBy.has(k) || (p.liquidity?.usd || 0) > (liveBy.get(k).liquidity?.usd || 0))) liveBy.set(k, p);
      }
    } catch {}
  }
  const field = meta.runners.map((x) => {
    const L = liveBy.get(x.address);
    return L ? { ...x, change: { ...x.change, h24: L.priceChange?.h24 ?? x.change?.h24 }, volume24h: L.volume?.h24 ?? x.volume24h, liquidity: L.liquidity?.usd ?? x.liquidity } : x;
  });
  const top = leader(field);
  const r = a ? all.find((x) => x.address === a) : top;
  if (!r) return new Response('not found', { status: 404 });

  // Fresh numbers for the card.
  let live = liveBy.get(r.address) || null;
  if (!live) {
    try {
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${r.address}`, { signal: AbortSignal.timeout(6000), cache: 'no-store' });
      const pairs = res.ok ? await res.json() : [];
      live = [...(pairs || [])].sort((x, y) => (y.liquidity?.usd || 0) - (x.liquidity?.usd || 0))[0] || null;
    } catch {}
  }
  const h24 = live?.priceChange?.h24 ?? r.change?.h24;
  const cap = live?.marketCap ?? r.marketCap;
  const vol = live?.volume?.h24 ?? r.volume24h;
  const buys = live?.txns?.h24?.buys ?? r.buys24h;
  const sells = live?.txns?.h24?.sells ?? r.sells24h;
  const buyShare = buys + sells > 0 ? Math.round((buys / (buys + sells)) * 100) : null;
  const isLead = top?.address === r.address;

  const [f500, f700, logo] = await Promise.all([font(500), font(700), logoData(live?.info?.imageUrl || r.image)]);
  const up = (h24 ?? 0) >= 0;
  const C = { bg: '#0A101B', card: '#111926', line: 'rgba(148,170,205,.16)', ink: '#EDF1F7', muted: '#8A96AB', amber: '#FFB020', up: '#2DD4A0', down: '#FF6B6B' };
  const stat = (label, value, first) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, padding: '26px 30px', borderLeft: first ? 'none' : `1.5px solid ${C.line}` }}>
      <span style={{ fontSize: 24, color: C.muted, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 40, color: C.ink, fontWeight: 700 }}>{value}</span>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: 1080, height: 1080, display: 'flex', flexDirection: 'column', background: `radial-gradient(circle at 50% 38%, #172235 0%, ${C.bg} 62%)`, color: C.ink, fontFamily: 'Supreme', padding: 72 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <svg width="44" height="44" viewBox="0 0 28 28">
              <circle cx="14" cy="14" r="11.5" fill="none" stroke={C.amber} strokeWidth="2.2" />
              <circle cx="14" cy="14" r="5" fill="none" stroke={C.amber} strokeWidth="1.8" opacity=".45" />
              <path d="M14 14 L14 2.5 A11.5 11.5 0 0 1 24.6 9.6 Z" fill={C.amber} opacity=".28" />
              <path d="M14 14 L24.6 9.6" stroke={C.amber} strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="18.56" cy="7.24" r="1.6" fill={C.amber} />
            </svg>
            <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>MetaTracker</span>
          </div>
          <span style={{ fontSize: 26, fontWeight: 700, color: C.amber, letterSpacing: 3 }}>{isLead ? '#1 TODAY' : 'RUNNING TODAY'}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 70, flex: 1 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img src={logo} width={220} height={220} style={{ borderRadius: 110, boxShadow: `0 0 90px -10px ${up ? 'rgba(45,212,160,.45)' : 'rgba(255,107,107,.4)'}` }} />
          ) : (
            <div style={{ width: 220, height: 220, borderRadius: 110, background: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, fontWeight: 700 }}>{(r.symbol || '?').slice(0, 2)}</div>
          )}
          <span style={{ fontSize: 76, fontWeight: 700, marginTop: 34, letterSpacing: -2 }}>{r.name}</span>
          <span style={{ fontSize: 32, color: C.muted, marginTop: 4 }}>${r.symbol}</span>
          <span style={{ fontSize: 150, fontWeight: 700, color: up ? C.up : C.down, marginTop: 14, letterSpacing: -5, lineHeight: 1 }}>{gain(h24)}</span>
          <span style={{ fontSize: 30, color: C.muted, marginTop: 6 }}>in 24 hours</span>
        </div>

        <div style={{ display: 'flex', background: C.card, border: `1.5px solid ${C.line}`, borderRadius: 26, marginTop: 40 }}>
          <div style={{ display: 'flex', flex: 1 }}>
            {stat('Market cap', usd(cap), true)}
            {stat('Volume, 24h', usd(vol))}
            {stat('Buys', buyShare != null ? `${buyShare}%` : '–')}
            {stat('Age', age(r.ageHours))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [
        { name: 'Supreme', data: f500, weight: 500, style: 'normal' },
        { name: 'Supreme', data: f700, weight: 700, style: 'normal' },
      ],
      headers: { 'cache-control': 'no-store' },
    },
  );
}
