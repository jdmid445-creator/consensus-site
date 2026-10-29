# MetaRadar: the news on today's Solana memecoin runners

Next.js site (same stack as GiftedSwaps, deploys on Vercel). It pulls the last 50
Solana memecoin runners, sorts them into themes, has Claude write a read of the
current meta, and lets anyone generate an original coin narrative for today's meta.
No wallet connection anywhere.

## Pages
- `/` everything: the read, the board of 50 logos, theme share bar, narratives,
  what's working, the runners table, the narrative writer
- `/docs` GitBook-style docs
- `/api/meta` public read-only JSON (cached 3 min)
- `/api/narrative` POST, used by the writer (rate-limited per visitor)

## How it works
1. Candidates: DexScreener's latest token profiles, boosts and community takeovers,
   plus GeckoTerminal's trending and top-volume Solana pools, plus coins remembered
   from the last week (`lib/pool.js`).
2. All candidates are looked up on DexScreener (30 per call); each token keeps its
   most liquid pair.
3. Runner = launched in the last 72h, market cap ≥ $100K, liquidity ≥ $8K. The 50
   biggest by market cap make the board. Window widens to 120h, then 168h on slow days.
4. Keyword themes (`lib/themes.js`) plus plain stats (`lib/stats.js`).
5. Claude reads the table and returns headline, narratives, working, losing steam
   (`lib/meta.js`). One read per 15 minutes, shared by all visitors.
6. Narrative writer: Claude writes one original idea on request (`lib/narrative.js`).

Nothing is ever faked: if a source is down, its part of the page is simply missing.

## Run it
```
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm install
npm run dev
```

## Deploy
1. Push to a GitHub repo, import it in Vercel.
2. Add `ANTHROPIC_API_KEY` in Vercel → Settings → Environment Variables.
3. Recommended: Vercel → Storage → Upstash Redis (free), connected to the project.
4. Optional: `COINGECKO_API_KEY`, `NEXT_PUBLIC_SITE_URL`, and the CA/X links once live.
