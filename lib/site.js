// Everything you'd want to change before launch lives here or in .env.
const ca = process.env.NEXT_PUBLIC_CA || '';

export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'MetaTracker',
  ticker: process.env.NEXT_PUBLIC_TICKER || '',
  tagline: 'The news on today\u2019s Solana runners.',
  description:
    'MetaTracker is a live tracker for Solana memecoins: the 50 coins running today, why they are trending, the backstory on each, and the narratives behind them. Live, no wallet needed.',
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000'),
  ca,
  links: {
    x: process.env.NEXT_PUBLIC_X_URL || 'https://x.com/metatrackerapp',
    telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL || '',
    dexscreener: ca ? `https://dexscreener.com/solana/${ca}` : '',
  },
};

// What counts as a runner. Tune these without touching code (see .env.example).
export const runnerRules = {
  count: 50,
  // Launched within this many hours. If fewer than `count` qualify, the window widens step by step.
  windows: (process.env.RUNNER_WINDOWS_HOURS || '72,120,168').split(',').map(Number).filter(Boolean),
  minMarketCap: Number(process.env.RUNNER_MIN_MCAP || 100_000),
  minLiquidity: Number(process.env.RUNNER_MIN_LIQUIDITY || 8_000),
};
