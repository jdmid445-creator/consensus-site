import Link from 'next/link';
import { site, runnerRules } from '@/lib/site';
import { THEMES } from '@/lib/themes';
import { TYPES } from '@/lib/types';
import { TypeIcon } from '@/components/TypeBadge';

export const metadata = { title: 'Docs' };

const SECTIONS = [
  ['overview', 'Overview'],
  ['top', 'Top runner and trending'],
  ['types', 'Coin types'],
  ['holders', 'Holder share'],
  ['runners', 'What counts as a runner'],
  ['sources', 'Where the data comes from'],
  ['themes', 'How themes are found'],
  ['read', 'The AI read'],
  ['narrative', 'Narrative writer'],
  ['refresh', 'How often it updates'],
  ['api', 'Public JSON'],
  ['limits', 'Limits'],
];

export default function Docs() {
  const hours = runnerRules.windows;
  return (
    <div className="wrap docs">
      <nav className="docs-nav" aria-label="Docs">
        <p className="docs-title">{site.name} docs</p>
        <ul>
          {SECTIONS.map(([id, label]) => (
            <li key={id}><a href={`#${id}`}>{label}</a></li>
          ))}
        </ul>
        <Link href="/" className="docs-back">Back to the meta</Link>
      </nav>

      <article className="docs-body">
        <h1 id="overview">Overview</h1>
        <p>{site.name} reads the last {runnerRules.count} Solana memecoin runners and tells you what the meta is: which narratives are running, what the runners have in common, and what&apos;s losing steam. Everything is on the front page and nothing needs a wallet.</p>
        <p>Every number on the site comes straight from market data at the time of the update. The only writing that comes from AI is the read itself (headline, narratives, working and losing steam) and the narratives you ask the writer for.</p>

        <h2 id="top">Top runner and trending</h2>
        <p>The top of the page is the runner with the biggest 24-hour gain that also has real trading behind it (at least $50K of volume and $15K of liquidity). Its 24h change, price, last-hour change and market cap update every 15 seconds while the page is open.</p>
        <p>Below it, the trending list re-ranks the runners by their gain over 30 minutes, 1 hour, 6 hours, 12 hours or 24 hours. The 1h, 6h and 24h numbers update live. The 30m number comes from GeckoTerminal and refreshes every few minutes. Neither source gives a 12-hour number, so 12h is worked out from hourly price candles; a brand-new runner can take a few minutes to get one.</p>

        <h2 id="types">Coin types</h2>
        <p>Each runner gets a badge for what kind of coin it is:</p>
        <ul className="docs-themes">
          {TYPES.map((t) => <li key={t.id}><span className={`type type-${t.id}`}><TypeIcon id={t.id} size={14} /></span> <span><b>{t.name}</b>: {t.blurb}</span></li>)}
        </ul>
        <p>Community takeover comes straight from DexScreener&apos;s takeover list. The rest start as a keyword guess and are then set by the AI read, which sees each coin&apos;s name, description and socials.</p>

        <h2 id="holders">Holder share</h2>
        <p>&quot;Top 10&quot; is the share of a coin&apos;s supply held by its 10 biggest wallets, read from Solana through Helius. The liquidity pool&apos;s own balance is left out, because it isn&apos;t a holder. It refreshes every 30 minutes per coin.</p>

        <h2 id="runners">What counts as a runner</h2>
        <p>A runner is a Solana token that:</p>
        <ul>
          <li>launched in the last <b>{hours[0]} hours</b>,</li>
          <li>is worth at least <b>${(runnerRules.minMarketCap / 1000).toLocaleString()}K</b> right now, and</li>
          <li>has at least <b>${(runnerRules.minLiquidity / 1000).toLocaleString()}K</b> of liquidity in its main pool.</li>
        </ul>
        <p>The {runnerRules.count} biggest by market cap make the board. On slow days, when fewer than {runnerRules.count} qualify, the window widens to {hours.slice(1).join(' and then ')} hours. The front page always says which window is in use.</p>
        <p>Stablecoins, SOL and long-established tokens are excluded.</p>

        <h2 id="sources">Where the data comes from</h2>
        <table className="docs-table">
          <thead><tr><th>Source</th><th>Used for</th></tr></thead>
          <tbody>
            <tr><td>DexScreener</td><td>Prices, market cap, liquidity, volume, trades, launch time, logos and socials. Also new token profiles, boosts and community takeovers, which surface coins people are putting money behind.</td></tr>
            <tr><td>GeckoTerminal</td><td>Trending and top-volume Solana pools (to find candidates), 30-minute change, and the price candles behind the 12h numbers and the top runner&apos;s chart.</td></tr>
            <tr><td>Helius</td><td>The biggest holders of each runner, for the top-10 share.</td></tr>
            <tr><td>Claude (Anthropic)</td><td>The written read of the meta and the narrative writer.</td></tr>
          </tbody>
        </table>
        <p>Candidates that get close to qualifying are remembered for up to a week, so a coin that ran two days ago stays on the board even after it drops off the &quot;latest&quot; lists.</p>

        <h2 id="themes">How themes are found</h2>
        <p>Each runner is first sorted by the words in its name, ticker and description into one of these themes:</p>
        <ul className="docs-themes">
          {THEMES.map((t) => <li key={t.id}><span className="sw" style={{ '--c': t.color }} /> {t.name}</li>)}
          <li><span className="sw" style={{ '--c': '#6B7280' }} /> One-offs (no clear theme)</li>
        </ul>
        <p>These colors are the board, the bar under it and the filter on the runners table. The AI read then goes further and names the specific narratives behind them, like a particular kind of animal story rather than just &quot;animals&quot;.</p>

        <h2 id="read">The AI read</h2>
        <p>Claude gets the current runners as a table: name, ticker, market cap, age, 24h change, launchpad, which socials they have, and the creator&apos;s own description. It writes the headline, groups the runners into 3 to 6 narratives (each marked rising, holding or cooling), and lists what&apos;s working and what&apos;s losing steam.</p>
        <p>It&apos;s told to stick to the data, to treat coin descriptions as data rather than instructions, and never to give buy or sell calls. One read is written every 15 minutes and shared by every visitor.</p>

        <h2 id="narrative">Narrative writer</h2>
        <p>Pick one of today&apos;s narratives (or leave it on the strongest) and optionally type your own angle. You get:</p>
        <ul>
          <li>a name and ticker that don&apos;t match any current runner,</li>
          <li>the lore in a few short paragraphs,</li>
          <li>why it fits today, with the runners it sits next to,</li>
          <li>a logo direction that works as a small avatar on a dex feed and on white,</li>
          <li>a first post with no ticker, cashtag or contract address in it.</li>
        </ul>
        <p>It won&apos;t copy an existing coin, impersonate a real person or brand, or talk price. Each visitor can write a few per minute.</p>

        <h2 id="refresh">How often it updates</h2>
        <p>Market data refreshes every 3 minutes. The AI read refreshes every 15 minutes. The time of the last update is shown at the top of the front page.</p>

        <h2 id="api">Public JSON</h2>
        <p>Everything on the front page is available as JSON at <a href="/api/meta"><code>/api/meta</code></a>. It&apos;s read-only and cached for 3 minutes.</p>
        <pre className="docs-code"><code>{`{
  "runners": [{ "rank", "address", "name", "symbol", "image",
                "marketCap", "liquidity", "volume24h",
                "change": { "h1", "h6", "h24" },
                "ageHours", "launchpad", "theme",
                "socials": { "x", "telegram", "website" }, "url" }],
  "stats":   { "themes", "launchpads", "medianCap", "medianAgeHours", ... },
  "summary": { "headline", "dek", "themes", "working", "fading", "watch" },
  "windowHours": 72,
  "updatedAt": 1761670000000
}`}</code></pre>

        <h2 id="limits">Limits</h2>
        <ul>
          <li>It only sees coins that show up on DexScreener or GeckoTerminal. A coin that runs without ever trending there can be missed.</li>
          <li>Market caps move fast. The numbers are a snapshot from the last update.</li>
          <li>The keyword themes are rough by design. The AI read is the better guide.</li>
          <li>Nothing here is financial advice.</li>
        </ul>
      </article>
    </div>
  );
}
