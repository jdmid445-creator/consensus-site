import { resolveTokens } from './dexscreener';

// The markets bar: majors and the big Solana coins, from their most liquid Solana pairs on
// DexScreener (wrapped BTC and ETH track the real prices closely). One call, cached a minute;
// the bar then updates live in the browser.
const ASSETS = [
  { id: 'BTC', name: 'Bitcoin', address: 'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij' },
  { id: 'ETH', name: 'Ether', address: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs' },
  { id: 'SOL', name: 'Solana', address: 'So11111111111111111111111111111111111111112' },
  { id: 'JUP', name: 'Jupiter', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN' },
  { id: 'BONK', name: 'Bonk', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { id: 'WIF', name: 'dogwifhat', address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
  { id: 'POPCAT', name: 'Popcat', address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr' },
  { id: 'PENGU', name: 'Pudgy Penguins', address: '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv' },
  { id: 'FARTCOIN', name: 'Fartcoin', address: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump' },
  { id: 'TRUMP', name: 'Official Trump', address: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN' },
];

export async function getMarkets() {
  const pairs = await resolveTokens(ASSETS.map((a) => a.address), { revalidate: 60 });
  return ASSETS.map((a) => {
    const p = pairs.get(a.address);
    return { ...a, price: p ? Number(p.priceUsd) || null : null, h24: p?.priceChange?.h24 ?? null, image: p?.info?.imageUrl || '' };
  }).filter((a) => a.price);
}
