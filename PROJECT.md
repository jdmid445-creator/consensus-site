# Runners (formerly Consensus): project notes

On-chain "meta consensus" tool for Solana memecoins. Sibling of GiftedSwaps and Parallax;
same stack (Next.js 15 + React 19, plain CSS, Vercel) and the same launch playbook.

## Playbook rules this site follows
- Utility works instantly on the landing page, no wallet, everything within 1 page.
- Light site. Works on iPhone (checked at 390px: no sideways scroll).
- No stock crypto layout, no eyebrow labels above headings, no monospace numbers,
  no cursive serif accents, no generic AI widgets. Custom icon set (`components/Icons.js`).
- Real assets: the board and the hero background are the runners' own logos.
- CA lives in the footer (env `NEXT_PUBLIC_CA`), never the hero.
- Docs page in GitBook style (`/docs`).
- Nothing faked: every number is live market data; if a source fails, that part is missing.

## Design
- Signature element: "the board", the 50 runner logos grouped by theme color.
- Palette: page #ECEFF2, sheet #FFF, ink #15181D, muted #5F6773, up #0B8A4F, down #D4373C.
  Theme colors live in `lib/themes.js`.
- Type: Archivo (variable width). Expanded (wdth 112–125) for headlines, 100 for body. Tabular figures.
- Buttons and chips share one "ticket" shape: 5px left corners, 16px right.

## Decisions
- Runner = launched ≤72h, mcap ≥$100K, liquidity ≥$8K, top 50 by mcap. Window widens to 120h/168h on slow days.
- Candidates: DexScreener profiles/boosts/CTOs + GeckoTerminal trending/top pools + a remembered pool (Upstash or memory).
- AI: Claude via Messages API with a forced tool for structured output. Meta read once per 15 min (shared).
  Narrative writer rate-limited 6/min and 40/hour per IP.
- Narrative writer's first post follows the playbook: no ticker, cashtag, CA, "SOL" or "launch".
- No impersonation of real people/brands and no price talk in generated narratives.
