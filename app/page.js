import Link from 'next/link';
import Board from '@/components/Board';
import CoinImg from '@/components/CoinImg';
import Ago from '@/components/Ago';
import AutoRefresh from '@/components/AutoRefresh';
import LeadCard from '@/components/LeadCard';
import NewRunners from '@/components/NewRunners';
import CountUp from '@/components/CountUp';
import Trending from '@/components/Trending';
import { Rising, Steady, Cooling, Pen } from '@/components/Icons';
import Wire from '@/components/Wire';
import Headlines from '@/components/Headlines';
import Widget from '@/components/Widget';
import { getCandles } from '@/lib/gecko';
import { getWire } from '@/lib/wire';
import { getHeadlines } from '@/lib/news';
import { getMeta, WINDOWS } from '@/lib/meta';
import { share, gain } from '@/lib/format';

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
      <section className="dash empty-state">
        <AutoRefresh ms={20000} />
        <h1 className="headline">The desk is loading today&apos;s runners.</h1>
        <p className="dek">Market data didn&apos;t come through on this refresh. This page tries again by itself every 20 seconds.</p>
      </section>
    );
  }

  const lead = byAddr.get(meta.top) || runners[0];
  const [chart, wire, headlines] = await Promise.all([
    lead.pairAddress ? getCandles(lead.pairAddress, { timeframe: 'minute', aggregate: 15, limit: 96, revalidate: 300 }) : [],
    getWire(8).catch(() => []),
    getHeadlines(6).catch(() => []),
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
  const narratives = allNarratives.slice(0, 5);
  const totalCap = stats.totalCap || 1;
  const mover = byAddr.get(stats.topMover);
  const pad = stats.launchpads[0];
  const newest = [...runners].filter((r) => r.ageHours != null).sort((a, b) => a.ageHours - b.ageHours).slice(0, 6);

  return (
    <div className="dash">
      <AutoRefresh ms={60000} />

      <div className="dash-col dash-main">
        <section className="wg wg-today" aria-labelledby="today-title">
          <p className="dateline">
            <span>{today()}</span>
            <Ago at={meta.updatedAt} />
          </p>
          <h1 id="today-title" className="headline">{headline}</h1>
          <p className="dek">{dek}</p>
          <div className="today-foot">
            <div className="today-stats">
              <div><span>Runners</span><b><CountUp value={stats.count} kind="int" /></b></div>
              <div><span>Combined cap</span><b><CountUp value={stats.totalCap} kind="usd" /></b></div>
              <div><span>Median age</span><b><CountUp value={stats.medianAgeHours} kind="age" /></b></div>
              <div><span>Buys</span><b><CountUp value={stats.buyShare} kind="share" /></b></div>
            </div>
          </div>
        </section>

        <Widget id="movers" title="Top movers" className="wg-movers">
          <Trending windows={WINDOWS} trending={meta.trending} runners={runners} limit={6} />
        </Widget>

        <Widget id="field" title="The field" note="24h moves" className="wg-field">
          <Board runners={runners} themes={stats.themes} />
        </Widget>

        <Widget id="narratives" title="Narratives" className="wg-narr">
          <ol className="nl">
            {narratives.map((n, i) => {
              const cap = n.coins.reduce((t, r) => t + r.marketCap, 0);
              const heat = n.heat && HEAT[n.heat];
              return (
                <li key={n.name + i}>
                  <div className="nl-top">
                    <b>{n.name}</b>
                    {heat && <span className={`heat heat-${n.heat}`}><heat.Icon width={14} height={14} /> {heat.label}</span>}
                  </div>
                  {n.take && <p>{n.take}</p>}
                  <div className="nl-coins">
                    <span className="stack">
                      {n.coins.slice(0, 5).map((r) => (
                        <Link key={r.address} href={`/coin/${r.address}`} title={`${r.name} ($${r.symbol})`}>
                          <CoinImg src={r.image} name={r.name} symbol={r.symbol} size={24} />
                        </Link>
                      ))}
                    </span>
                    <span className="note">{n.coins.length} {n.coins.length === 1 ? 'coin' : 'coins'}, {share(cap / totalCap)} of cap</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </Widget>
      </div>

      <div className="dash-col dash-side">
        <div className="wg wg-lead">
          <LeadCard
            lead={lead}
            chart={chart}
            field={runners.map((r) => ({ address: r.address, name: r.name, symbol: r.symbol, image: r.image, type: r.type, why: r.why, url: r.url, socials: { x: r.socials.x }, change: { h1: r.change.h1, h24: r.change.h24 }, marketCap: r.marketCap, volume24h: r.volume24h, liquidity: r.liquidity, ageHours: r.ageHours, top10: r.top10 }))}
          />
        </div>

        <Widget title="New runners" note="24h" action="All coins" href="/coins" className="wg-new">
          <NewRunners coins={newest} />
        </Widget>

        <Widget id="latest" title="The wire" className="wg-wire">
          <Wire events={wire.map((e) => ({ ...e, image: byAddr.get(e.address)?.image || e.image }))} />
        </Widget>

        <Widget title="What's working" className="wg-work">
          {summary ? (
            <div className="ww">
              <ul className="ww-list">
                {summary.working.slice(0, 3).map((w, i) => <li key={i} className="ww-up">{w}</li>)}
                {summary.fading.slice(0, 2).map((w, i) => <li key={`f${i}`} className="ww-down">{w}</li>)}
              </ul>
            </div>
          ) : (
            <ul className="ww-list">
              <li><CountUp value={stats.withX} kind="share" /> have an X account and <CountUp value={stats.withSite} kind="share" /> have a website.</li>
              {pad && <li><CountUp value={pad.share} kind="share" /> launched on {pad.name}.</li>}
              {mover && <li>Biggest 24h move: <Link href={`/coin/${mover.address}`}>{mover.name}</Link>, <b className={mover.change.h24 >= 0 ? 'up' : 'down'}>{gain(mover.change.h24)}</b>.</li>}
            </ul>
          )}
        </Widget>

        <Widget title="Crypto headlines" className="wg-news">
          <Headlines items={headlines} />
        </Widget>
      </div>






      <Link href="/write" className="wg wg-write">
        <span className="wg-write-icon"><Pen width={20} height={20} /></span>
        <span>
          <b>Write a narrative for today</b>
          <span>An original coin idea built on what&apos;s running right now.</span>
        </span>
      </Link>
    </div>
  );
}
