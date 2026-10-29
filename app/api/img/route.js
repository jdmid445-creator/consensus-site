// Serves coin logos from our own domain, so they load even where token CDNs are slow,
// blocked, or picky about referrers. Only image responses from known token-image hosts.
export const runtime = 'edge';

const HOSTS = ['dexscreener.com', 'geckoterminal.com', 'coingecko.com', 'ipfs.io', 'pinata.cloud', 'arweave.net', 'pump.fun', 'irys.xyz', 'nftstorage.link', 'cf-ipfs.com', 'dweb.link', 'moralis.io', 'bonk.fun', 'bags.fm', 'helius-rpc.com', 'imgur.com', 'w3s.link', 'ipfs.dweb.link', 'mypinata.cloud', 'pump.mypinata.cloud', 'quicknode-ipfs.com', 'filebase.io', 'twimg.com', 'githubusercontent.com', 'letsbonk.fun', 'raydium.io', 'moonshot.money'];
const MAX = 3 * 1024 * 1024;

export async function GET(req) {
  const raw = new URL(req.url).searchParams.get('u') || '';
  let u;
  try { u = new URL(raw); } catch { return new Response('bad url', { status: 400 }); }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== 'https:' || !HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return new Response('host not allowed', { status: 403 });

  try {
    const res = await fetch(u.toString(), { headers: { accept: 'image/*' }, redirect: 'follow' });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.startsWith('image/') || type.includes('svg')) return new Response('not an image', { status: 404 });
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX) return new Response('too large', { status: 413 });
    return new Response(buf, {
      headers: {
        'content-type': type,
        'cache-control': 'public, max-age=86400, s-maxage=604800, immutable',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch {
    return new Response('upstream failed', { status: 502 });
  }
}
