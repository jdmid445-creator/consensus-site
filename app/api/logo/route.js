import { hasRedis, redis } from '@/lib/pool';

// GET /api/logo?a=<mint>: a coin's logo, found wherever it lives. The last resort for any coin
// whose image didn't come through: tries DexScreener, the coin's launch metadata (Helius),
// GeckoTerminal and pump.fun, remembers which address worked for a week, and serves the image.
export const dynamic = 'force-dynamic';

const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const KEY = 'consensus:logo:';
const MAX = 3 * 1024 * 1024;
const memory = new Map();

async function json(url, init = {}, ms = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch { return null; } finally { clearTimeout(t); }
}

const https = (u) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : '');
const ipfs = (u) => (typeof u === 'string' && u.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${u.slice(7)}` : u);

async function candidates(mint) {
  const out = [];
  const dex = await json(`${process.env.DEXSCREENER_BASE || 'https://api.dexscreener.com'}/tokens/v1/solana/${mint}`);
  for (const p of Array.isArray(dex) ? dex : []) if (p?.baseToken?.address === mint && https(p.info?.imageUrl)) { out.push(p.info.imageUrl); break; }
  if (process.env.HELIUS_API_KEY) {
    const a = await json(`${process.env.HELIUS_RPC_BASE || 'https://mainnet.helius-rpc.com'}/?api-key=${process.env.HELIUS_API_KEY}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'logo', method: 'getAsset', params: { id: mint } }),
    });
    const c = a?.result?.content;
    for (const f of c?.files || []) { if (https(f?.cdn_uri)) out.push(f.cdn_uri); if (https(ipfs(f?.uri))) out.push(ipfs(f.uri)); }
    if (https(ipfs(c?.links?.image))) out.push(ipfs(c.links.image));
  }
  const gt = await json(`${process.env.GECKOTERMINAL_BASE || 'https://api.geckoterminal.com/api/v2'}/networks/solana/tokens/${mint}`);
  const gi = gt?.data?.attributes?.image_url;
  if (https(gi) && !/missing/i.test(gi)) out.push(gi);
  if (mint.endsWith('pump')) {
    const pf = await json(`https://frontend-api-v3.pump.fun/coins/${mint}`);
    if (https(ipfs(pf?.image_uri))) out.push(ipfs(pf.image_uri));
  }
  return [...new Set(out)];
}

async function image(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { headers: { accept: 'image/*' }, redirect: 'follow', signal: ctrl.signal, cache: 'no-store' });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.startsWith('image/') || type.includes('svg')) return null;
    const buf = await res.arrayBuffer();
    return buf.byteLength && buf.byteLength <= MAX ? { buf, type } : null;
  } catch { return null; } finally { clearTimeout(t); }
}

export async function GET(req) {
  const a = new URL(req.url).searchParams.get('a') || '';
  if (!MINT.test(a)) return new Response('bad address', { status: 400 });

  let known = memory.get(a) || null;
  if (!known && hasRedis()) {
    try { const [r] = await redis([['GET', KEY + a]]); if (r?.result) known = r.result; } catch {}
  }
  const tries = known && known !== 'none' ? [known] : known === 'none' ? [] : await candidates(a);
  for (const u of tries) {
    const img = await image(u);
    if (!img) continue;
    memory.set(a, u);
    if (hasRedis() && u !== known) { try { await redis([['SET', KEY + a, u, 'EX', 7 * 86400]]); } catch {} }
    return new Response(img.buf, { headers: { 'content-type': img.type, 'cache-control': 'public, max-age=86400, s-maxage=604800', 'x-content-type-options': 'nosniff' } });
  }
  // Nothing found: remember that briefly so we don't search again on every view.
  if (!known) { memory.set(a, 'none'); if (hasRedis()) { try { await redis([['SET', KEY + a, 'none', 'EX', 1800]]); } catch {} } }
  return new Response('no logo', { status: 404, headers: { 'cache-control': 'public, s-maxage=600' } });
}
