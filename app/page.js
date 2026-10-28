import Board from '@/components/Board';
import CoinImg from '@/components/CoinImg';
import RunnersTable from '@/components/RunnersTable';
import NarrativeWriter from '@/components/NarrativeWriter';
import Ago from '@/components/Ago';
import { Rising, Steady, Cooling } from '@/components/Icons';
import { getMeta } from '@/lib/meta';
import { themeById } from '@/lib/themes';
import { usd, share, age, pct } from '@/lib/format';

export const revalidate = 180;

const HEAT = {
  rising: { Icon: Rising, label: 'Rising' },
  steady: { Icon: Steady, label: 'Holding' },
  cooling: { Icon: Cooling, label: 'Cooling' },
};

const today = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' });

export default async function Home() {
  const meta = await getMeta();
  const { runners, stats, summary } = meta;
  const byAddr = new Map(runners.map((r) => [r.address, r]));

  if (!runners.length) {
    return (
      <section className="wrap empty-state">
        <h1 className="display">The board is loading.</h1>
        <p className="lede">Market data didn&apos;t come through this time. The page refreshes itself every few minutes, so reload in a moment.</p>
      </section>
    );
  }

  const top = stats.themes[0];
  const headline = summary?.headline || `${top.name} hold ${share(top.shareCap)} of the board`;
  const dek =
    summary?.dek ||
    `${stats.count} runners launched in the last ${meta.windowHours} hours, sorted into themes by name and description. The median one is ${age(stats.medianAgeHours)} old with a ${usd(stats.medianCap)} market cap.`;

  // AI narratives if available, otherwise the keyword themes.
  const narratives = summary?.themes?.length
    ? summary.themes.map((t) => ({ ...t, coins: t.addresses.map((a) => byAddr.get(a)).filter(Boolean) }))
    : stats.themes.filter((t) => t.id !== 'other').map((t) => ({ name: t.name, take: '', heat: null, coins: t.addresses.map((a) => byAddr.get(a)).filter(Boolean) }));
  const totalCap = stats.totalCap || 1;

  const mover = byAddr.get(stats.topMover);
  const pad = stats.launchpads[0];

  return (
    <>
      {/* Front: the read and the board */}
      <section className="front">
        <div className="front-bg" aria-hidden="true">
          {runners.slice(0, 24).map((r) => r.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={r.address} src={r.image} alt="" referrerPolicy="no-referrer" loading="lazy" />
          ))}
        </div>
        <div className="wrap front-in">
          <div className="read">
            <p className="date">
              <span>{today()}</span>
              <Ago at={meta.updatedAt} />
            </p>
            <h1 className="display">{headline}</h1>
            <p className="lede">{dek}</p>
            <div className="read-actions">
              <a href="#write" className="btn btn-ink">Write a narrative for today</a>
              <a href="#runners" className="btn btn-quiet">See all {stats.count} runners</a>
            </div>
          </div>
          <Board runners={runners} themes={stats.themes} />
        </div>
      </section>

      {/* Market cap share by theme */}
      <section className="wrap mix-sec" aria-label="Share of runner market cap by theme">
        <div className="mix">
          {stats.themes.map((t) => (
            <span key={t.id} className="mix-seg" style={{ '--c': t.color, flexGrow: Math.max(t.shareCap, 0.015) }} title={`${t.name}: ${share(t.shareCap)} of market cap`}>
              {t.shareCap >= 0.08 && <span className="mix-label">{t.name} <b className="num">{share(t.shareCap)}</b></span>}
            </span>
          ))}
        </div>
        <p className="small muted mix-note">Share of the combined {usd(stats.totalCap)} market cap held by each theme.</p>
      </section>

      {/* Narratives */}
      <section id="narratives" className="wrap section">
        <div className="sec-head">
          <h2 className="h2">The narratives</h2>
          <p className="muted">{summary ? 'What the runners have in common right now, read from names, lore and numbers.' : 'Runners grouped by the words in their names and descriptions.'}</p>
        </div>
        <ol className="lanes">
          {narratives.map((n, i) => {
            const cap = n.coins.reduce((s, r) => s + r.marketCap, 0);
            const heat = n.heat && HEAT[n.heat];
            return (
              <li key={n.name + i} className="lane">
                <div className="lane-main">
                  <h3>{n.name}</h3>
                  {heat && (
                    <span className={`heat heat-${n.heat}`}>
                      <heat.Icon width={16} height={16} /> {heat.label}
                    </span>
                  )}
                  {n.take && <p>{n.take}</p>}
                </div>
                <div className="lane-coins">
                  <div className="stack">
                    {n.coins.slice(0, 7).map((r) => (
                      <a key={r.address} href={r.url} target="_blank" rel="noopener noreferrer" title={`${r.name} ($${r.symbol})`}>
                        <CoinImg src={r.image} name={r.name} symbol={r.symbol} color={themeById(r.theme).color} size={38} />
                      </a>
                    ))}
                    {n.coins.length > 7 && <span className="stack-more num">+{n.coins.length - 7}</span>}
                  </div>
                  <p className="small muted num">{n.coins.length} {n.coins.length === 1 ? 'runner' : 'runners'}, {share(cap / totalCap)} of cap</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* What's working */}
      <section className="wrap section">
        <div className="sec-head">
          <h2 className="h2">What&apos;s working</h2>
        </div>
        <div className="working">
          <div className="facts">
            <p><b className="num">{age(stats.medianAgeHours)}</b> is how old the median runner is, at a <b className="num">{usd(stats.medianCap)}</b> market cap.</p>
            <p><b className="num">{share(stats.withX)}</b> have an X account and <b className="num">{share(stats.withSite)}</b> have a website.</p>
            <p><b className="num">{share(stats.paidProfile)}</b> paid for a DexScreener profile.</p>
            {pad && <p><b className="num">{share(pad.share)}</b> launched on {pad.name}.</p>}
            <p><b className="num">{share(stats.buyShare)}</b> of today&apos;s trades across the board were buys.</p>
            {mover && (
              <p>
                Biggest mover today: <a href={mover.url} target="_blank" rel="noopener noreferrer">{mover.name}</a>, <b className={`num ${mover.change.h24 >= 0 ? 'up' : 'down'}`}>{pct(mover.change.h24)}</b>.
              </p>
            )}
          </div>
          {summary && (
            <>
              <div className="list-col">
                <h3>Working</h3>
                <ul className="ticks">{summary.working.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </div>
              <div className="list-col">
                <h3>Losing steam</h3>
                <ul className="ticks ticks-down">{summary.fading.map((w, i) => <li key={i}>{w}</li>)}</ul>
                {summary.watch && <p className="watch"><b>Watch next.</b> {summary.watch}</p>}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Runners */}
      <section id="runners" className="wrap section">
        <div className="sec-head">
          <h2 className="h2">All {stats.count} runners</h2>
          <p className="muted">The biggest Solana memecoins launched in the last {meta.windowHours} hours, by market cap. Tap one to open its chart.</p>
        </div>
        <RunnersTable runners={runners} themes={stats.themes} />
      </section>

      {/* Narrative writer */}
      <section id="write" className="wrap section">
        <div className="sec-head">
          <h2 className="h2">Write a narrative for today&apos;s meta</h2>
          <p className="muted">An original coin idea built on what&apos;s running right now. Every one is new, and it won&apos;t reuse a live ticker.</p>
        </div>
        <NarrativeWriter enabled={meta.aiEnabled} narratives={(summary?.themes || stats.themes.filter((t) => t.id !== 'other')).map((t) => t.name).slice(0, 6)} />
      </section>
    </>
  );
}
