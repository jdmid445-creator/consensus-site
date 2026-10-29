import Link from 'next/link';
import Board from '@/components/Board';
import CoinImg from '@/components/CoinImg';
import RunnersTable from '@/components/RunnersTable';
import NarrativeWriter from '@/components/NarrativeWriter';
import Ago from '@/components/Ago';
import Ticker from '@/components/Ticker';
import AutoRefresh from '@/components/AutoRefresh';
import LeadCard from '@/components/LeadCard';
import NewRunners from '@/components/NewRunners';
import CountUp from '@/components/CountUp';
import Trending from '@/components/Trending';
import { Rising, Steady, Cooling } from '@/components/Icons';
import Wire from '@/components/Wire';
import Headlines from '@/components/Headlines';
import MarketStrip from '@/components/MarketStrip';
import { getCandles } from '@/lib/gecko';
import { getWire } from '@/lib/wire';
import { getHeadlines } from '@/lib/news';
import { getMarkets } from '@/lib/markets';
import { getMeta, WINDOWS } from '@/lib/meta';
import { usd, share, age, pct, gain } from '@/lib/format';

export const revalidate = 180;
export const maxDuration = 60; // room for the AI read when it refreshes

const HEAT = {
  rising: { Icon: Rising, label: 'Rising' },
  steady: { Icon: Steady, label: 'Holding' },
  cooling: { Icon: Cooling, label: 'Cooling' },
};

const today = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });

export default async function Home() {
  const meta = await getMeta();
  const { runners, stats, summary } = meta;
  const byAddr = new Map(runners.map((r) => [r.address, r]));

  if (!runners.length) {
    return (
      <section className="wrap empty-state">
        <h1 className="headline">The desk is loading today&apos;s runners.</h1>
        <p className="dek">Market data didn&apos;t come through on this refresh. The page updates itself every few minutes, so check back shortly.</p>
      </section>
    );
  }

  const lead = byAddr.get(meta.top) || runners[0];
  const next = runners
    .filter((r) => r.address !== lead.address && typeof r.change.h24 === 'number' && r.volume24h >= 50_000)
    .sort((a, b) => b.change.h24 - a.change.h24)
    .slice(0, 3);
  const [chart, wire, headlines, markets] = await Promise.all([
    lead.pairAddress ? getCandles(lead.pairAddress, { timeframe: 'minute', aggregate: 15, limit: 96, revalidate: 300 }) : [],
    getWire(14).catch(() => []),
    getHeadlines(10).catch(() => []),
    getMarkets().catch(() => []),
  ]);

  const named = stats.themes.filter((t) => t.id !== 'other');
  const headline = summary?.headline || `${lead.name} leads today's Solana runners`;
  const dek =
    summary?.dek ||
    `${lead.name} is up ${gain(lead.change.h24)} in 24 hours. ${named[0] ? `${named[0].name} is the biggest theme, with ${share(named[0].shareCap)} of the field's market cap.` : ''}`;

  const allNarratives = (summary?.themes?.length
    ? summary.themes.map((t) => ({ ...t, coins: t.addresses.map((a) => byAddr.get(a)).filter(Boolean) }))
    : named.map((t) => ({ name: t.name, take: '', heat: null, coins: t.addresses.map((a) => byAddr.get(a)).filter(Boolean) }))
  ).filter((n) => n.coins.length);
  // Two columns, so keep an even number: drop the smallest one when the count is odd.
  const narratives = allNarratives.length > 1 && allNarratives.length % 2 ? allNarratives.slice(0, -1) : allNarratives;
  const totalCap = stats.totalCap || 1;
  const mover = byAddr.get(stats.topMover);
  const pad = stats.launchpads[0];
  const newest = [...runners].filter((r) => r.ageHours != null).sort((a, b) => a.ageHours - b.ageHours).slice(0, 8);
  const typeCounts = runners.reduce((m, r) => ({ ...m, [r.type]: (m[r.type] || 0) + 1 }), {});

  return (
    <>
      <AutoRefresh ms={60000} />
      <Ticker runners={runners} />
      <MarketStrip markets={markets} field={{ count: stats.count, cap: stats.totalCap }} />

      {/* The lead: today's read, and the coin leading the day */}
      <section className="lead wrap">
        <NewRunners coins={newest} />
        <div className="lead-top">
          <p className="dateline">
            <span>{today()}</span>
            <Ago at={meta.updatedAt} />
          </p>
          <h1 className="headline">{headline}</h1>
        </div>
        <div className="lead-rest">
          <p className="dek">{dek}</p>
          <p className="byline">
            {summary ? 'Read' : 'Sorted by keyword'} from the {stats.count} biggest Solana memecoins launched in the last {meta.windowHours} hours.
          </p>
          <div className="lead-actions">
            <a href="#movers" className="btn btn-ink">See the movers</a>
            <a href="#write" className="btn btn-quiet">Write a narrative for today</a>
          </div>
          {narratives.length > 0 && (
            <nav className="inread" aria-labelledby="inread-title">
              <h2 id="inread-title">Today&apos;s narratives</h2>
              <ol>
                {narratives.slice(0, 4).map((n, i) => {
                  const heat = n.heat && HEAT[n.heat];
                  return (
                    <li key={n.name + i}>
                      <a href="#narratives">
                        <span className="inread-name">{n.name}</span>
                        {heat && <span className={`heat heat-${n.heat}`}><heat.Icon width={14} height={14} /> {heat.label}</span>}
                        <span className="inread-count">{n.coins.length} {n.coins.length === 1 ? 'coin' : 'coins'}</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}
        </div>
        <LeadCard lead={lead} next={next} chart={chart} />
      </section>

      {/* Latest: the wire and the crypto headlines */}
      <section id="latest" className="wrap latest" aria-label="Latest" data-reveal="up">
        <div className="latest-col">
          <div className="col-head">
            <h2 className="h3">The wire</h2>
            <p className="note">What just happened among the runners</p>
          </div>
          <Wire events={wire} />
        </div>
        <div className="latest-col">
          <div className="col-head">
            <h2 className="h3">Crypto headlines</h2>
            <p className="note">From CoinDesk, Cointelegraph, Decrypt, The Block and Blockworks</p>
          </div>
          <Headlines items={headlines} />
        </div>
      </section>

      {/* The field */}
      <section className="wrap field-sec" aria-labelledby="field-title" data-reveal="field">
        <div className="field-head">
          <h2 id="field-title" className="h3">The field</h2>
          <ul className="legend">
            {stats.themes.map((t) => (
              <li key={t.id} style={{ '--c': t.color }}>
                <span className="sw" aria-hidden="true" />
                {t.name} <span className="muted num">{t.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <Board runners={runners} themes={stats.themes} />
        <div className="mix" aria-label="Share of market cap by theme">
          {stats.themes.map((t, i) => (
            <span key={t.id} className="mix-seg" data-dark={t.ink === '#fff'} style={{ '--c': t.color, '--i': i, flexGrow: Math.max(t.shareCap, 0.012) }} title={`${t.name}: ${share(t.shareCap)} of market cap`}>
              {t.shareCap >= 0.13 && <span className="mix-label">{t.name} <b>{share(t.shareCap)}</b></span>}
            </span>
          ))}
        </div>
        <p className="note">Bar shows each theme&apos;s share of the field&apos;s combined {usd(stats.totalCap)} market cap.</p>
      </section>

      {/* Movers by window */}
      <section id="movers" className="wrap section" data-reveal="up">
        <div className="sec-head">
          <h2 className="h2">Top movers</h2>
          <p className="muted">The runners with the biggest gains over each window.</p>
        </div>
        <Trending windows={WINDOWS} trending={meta.trending} runners={runners} typeCounts={typeCounts} />
      </section>

      {/* Narratives */}
      <section id="narratives" className="wrap section" data-reveal="up">
        <div className="sec-head">
          <h2 className="h2">The narratives</h2>
          <p className="muted">{summary ? 'What today’s runners have in common, read from their names, lore and numbers.' : 'Runners grouped by the words in their names and descriptions.'}</p>
        </div>
        <ol className="stories">
          {narratives.map((n, i) => {
            const cap = n.coins.reduce((s, r) => s + r.marketCap, 0);
            const heat = n.heat && HEAT[n.heat];
            return (
              <li key={n.name + i} className="story">
                <div className="story-main">
                  <div className="story-top">
                    <h3>{n.name}</h3>
                    {heat && (
                      <span className={`heat heat-${n.heat}`}>
                        <heat.Icon width={15} height={15} /> {heat.label}
                      </span>
                    )}
                  </div>
                  {n.take && <p>{n.take}</p>}
                </div>
                <div className="story-coins">
                  <div className="stack">
                    {n.coins.slice(0, 6).map((r) => (
                      <Link key={r.address} href={`/coin/${r.address}`} title={`${r.name} ($${r.symbol})`}>
                        <CoinImg src={r.image} name={r.name} symbol={r.symbol} size={34} />
                      </Link>
                    ))}
                    {n.coins.length > 6 && <span className="stack-more">+{n.coins.length - 6}</span>}
                  </div>
                  <p className="note">{n.coins.length} {n.coins.length === 1 ? 'runner' : 'runners'}, {share(cap / totalCap)} of the field</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* What's working */}
      <section className="wrap section" data-reveal="up">
        <div className="sec-head">
          <h2 className="h2">What&apos;s working</h2>
        </div>
        <div className={summary ? 'working' : 'working solo'}>
          <div className="numbers">
            <h3>By the numbers</h3>
            <ul>
              <li><CountUp value={stats.medianAgeHours} kind="age" /> is how old the median runner is, at a <CountUp value={stats.medianCap} kind="usd" /> market cap.</li>
              <li><CountUp value={stats.withX} kind="share" /> have an X account and <CountUp value={stats.withSite} kind="share" /> have a website.</li>
              <li><CountUp value={stats.paidProfile} kind="share" /> paid for a DexScreener profile.</li>
              {pad && <li><CountUp value={pad.share} kind="share" /> launched on {pad.name}.</li>}
              <li><CountUp value={stats.buyShare} kind="share" /> of today&apos;s trades across the field were buys.</li>
              {stats.medianTop10 != null && <li>The 10 biggest wallets hold <CountUp value={stats.medianTop10} kind="share" /> of the median runner, pool excluded.</li>}
              {stats.concentration && (
                <li>
                  Coins with spread-out holders: <b className={stats.concentration.spreadChange >= 0 ? 'up' : 'down'}>{pct(stats.concentration.spreadChange)}</b> median today, vs <b className={stats.concentration.tightChange >= 0 ? 'up' : 'down'}>{pct(stats.concentration.tightChange)}</b> for concentrated ones.
                </li>
              )}
              {mover && (
                <li>
                  Biggest 24h move: <Link href={`/coin/${mover.address}`}>{mover.name}</Link>, <b className={mover.change.h24 >= 0 ? 'up' : 'down'}>{gain(mover.change.h24)}</b>.
                </li>
              )}
            </ul>
          </div>
          {summary && (
            <div className="calls">
              <div>
                <h3>Working</h3>
                <ul className="ticks">{summary.working.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
              <div>
                <h3>Losing steam</h3>
                <ul className="ticks ticks-down">{summary.fading.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
              {summary.watch && <p className="watch"><b>Watch next.</b> {summary.watch}</p>}
            </div>
          )}
        </div>
      </section>

      {/* Runners */}
      <section id="runners" className="wrap section" data-reveal="up">
        <div className="sec-head">
          <h2 className="h2">All {stats.count} runners</h2>
          <p className="muted">The biggest Solana memecoins launched in the last {meta.windowHours} hours, by market cap.</p>
        </div>
        <RunnersTable runners={runners} themes={stats.themes} />
      </section>

      {/* Narrative writer */}
      <section id="write" className="wrap section" data-reveal="up">
        <div className="sec-head">
          <h2 className="h2">Write a narrative for today&apos;s meta</h2>
          <p className="muted">An original coin idea built on what&apos;s running right now. Each one is new and never reuses a live ticker.</p>
        </div>
        <NarrativeWriter enabled={meta.aiEnabled} narratives={(summary?.themes || named).map((t) => t.name).slice(0, 6)} />
      </section>
    </>
  );
}
