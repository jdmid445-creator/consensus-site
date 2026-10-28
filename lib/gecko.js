import { getJson } from './http';

// GeckoTerminal trending + top Solana pools, used only to find candidate tokens
// (DexScreener supplies the numbers). Keyless is ~5 calls/min shared by IP, so results
// are cached for 5 minutes. A free CoinGecko demo key (COINGECKO_API_KEY) raises the limit.
function base() {
  const key = process.env.COINGECKO_API_KEY;
  if (key) return { url: 'https://api.coingecko.com/api/v3/onchain', headers: { 'x-cg-demo-api-key': key } };
  return { url: process.env.GECKOTERMINAL_BASE || 'https://api.geckoterminal.com/api/v2', headers: {} };
}

export async function getGeckoCandidates() {
  const { url, headers } = base();
  const paths = [
    '/networks/solana/trending_pools?duration=24h&page=1',
    '/networks/solana/trending_pools?duration=6h&page=1',
    '/networks/solana/pools?sort=h24_volume_usd_desc&page=1',
  ];
  const results = await Promise.all(paths.map((p) => getJson(url + p, { headers, revalidate: 300 })));
  const out = new Set();
  for (const r of results) {
    for (const pool of r?.data || []) {
      const id = pool?.relationships?.base_token?.data?.id || '';
      if (id.startsWith('solana_')) out.add(id.slice('solana_'.length));
    }
  }
  return out;
}
