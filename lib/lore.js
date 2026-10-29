import { hasRedis, redis } from './pool';

// Where a coin's backstory comes from, in its creators' own words:
//  - the description in its token metadata (what was typed in at launch on pump.fun etc.),
//    read through Helius' getAssetBatch: one call for all runners, cached a day per coin
//  - its website's text (coin pages only), cached six hours
const META_KEY = 'consensus:meta-desc:v2'; // { d: description, img: logo }
const memory = new Map();

export async function addLaunchDescriptions(runners) {
  const key = process.env.HELIUS_API_KEY;
  if (!key || !runners.length) return runners;
  const ids = runners.map((r) => r.address);
  const known = new Map();
  if (hasRedis()) {
    try {
      const [res] = await redis([['HMGET', META_KEY, ...ids]]);
      (res?.result || []).forEach((v, i) => { if (v != null) { try { known.set(ids[i], JSON.parse(v)); } catch {} } });
    } catch {}
  } else {
    for (const id of ids) if (memory.has(id)) known.set(id, memory.get(id));
  }
  const missing = ids.filter((id) => !known.has(id));
  if (missing.length) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${process.env.HELIUS_RPC_BASE || 'https://mainnet.helius-rpc.com'}/?api-key=${key}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 'lore', method: 'getAssetBatch', params: { ids: missing.slice(0, 100) } }),
        signal: ctrl.signal,
        cache: 'no-store',
      });
      clearTimeout(t);
      const out = res.ok ? await res.json() : null;
      const fresh = [];
      for (const a of out?.result || []) {
        if (!a?.id) continue;
        const d = String(a.content?.metadata?.description || '').replace(/\s+/g, ' ').trim().slice(0, 600);
        // The logo from the launch metadata, preferring Helius' own image CDN copy.
        const f = (a.content?.files || []).find((x) => /^image\//.test(x?.mime || '') || x?.cdn_uri) || a.content?.files?.[0];
        const img = String(f?.cdn_uri || a.content?.links?.image || f?.uri || '').trim();
        const v = { d, img: /^https:\/\//.test(img) ? img.slice(0, 500) : '' };
        known.set(a.id, v);
        fresh.push([a.id, JSON.stringify(v)]);
      }
      for (const [id] of fresh) memory.set(id, known.get(id));
      if (hasRedis() && fresh.length) {
        await redis([['HSET', META_KEY, ...fresh.flat()], ['EXPIRE', META_KEY, 24 * 3600]]);
      }
    } catch (e) {
      console.warn('[lore] metadata failed:', e.message);
    }
  }
  return runners.map((r) => {
    const k = known.get(r.address);
    // Coins without a DexScreener logo get the one from their launch metadata.
    return { ...r, launchDescription: k?.d || '', image: r.image || k?.img || '' };
  });
}

// The visible text of a coin's website, trimmed. Only public https pages, 5s, 400KB max.
export async function websiteText(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || /^(localhost|[\d.]+|\[)/.test(u.hostname) || /\b(x|twitter|t\.me|telegram|discord|youtube|tiktok|instagram)\./.test(u.hostname)) return '';
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(u.toString(), { signal: ctrl.signal, headers: { accept: 'text/html' }, next: { revalidate: 21600 } });
    clearTimeout(t);
    if (!res.ok || !(res.headers.get('content-type') || '').includes('text/html')) return '';
    const html = (await res.text()).slice(0, 400_000);
    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '').trim();
    const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] || '').trim();
    const body = html
      .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
    return [title, desc, body].filter(Boolean).join(' | ').slice(0, 1800);
  } catch {
    return '';
  }
}

// One coin's logo from its launch metadata (for coins that aren't today's runners).
export async function logoFor(mint) {
  if (!process.env.HELIUS_API_KEY) return '';
  const [r] = await addLaunchDescriptions([{ address: mint, image: '' }]);
  return r?.image || '';
}
