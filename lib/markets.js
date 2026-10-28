import { resolveTokens } from './dexscreener';

// SOL, BTC and ETH for the markets bar, from their most liquid Solana pairs on DexScreener
// (wrapped BTC and ETH track the real prices closely). One call, cached a minute.
const ASSETS = [
  { id: 'SOL', name: 'Solana', address: 'So11111111111111111111111111111111111111112' },
  { id: 'BTC', name: 'Bitcoin', address: 'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij' },
  { id: 'ETH', name: 'Ether', address: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs' },
];

export async function getMarkets() {
  const pairs = await resolveTokens(ASSETS.map((a) => a.address), { revalidate: 60 });
  return ASSETS.map((a) => {
    const p = pairs.get(a.address);
    return { ...a, price: p ? Number(p.priceUsd) || null : null, h24: p?.priceChange?.h24 ?? null };
  }).filter((a) => a.price);
}
