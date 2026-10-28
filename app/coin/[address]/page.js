import Link from 'next/link';
import { notFound } from 'next/navigation';
import CoinImg from '@/components/CoinImg';
import CoinStory from '@/components/CoinStory';
import LiveChart from '@/components/LiveChart';
import HolderStats from '@/components/HolderStats';
import CoinLive from '@/components/CoinLive';
import CopyText from '@/components/CopyText';
import TypeBadge from '@/components/TypeBadge';
import { Out, XLogo } from '@/components/Icons';
import { getMeta } from '@/lib/meta';
import { getCandles } from '@/lib/gecko';
import { getWire } from '@/lib/wire';
import { resolveTokens } from '@/lib/dexscreener';
import { typeById } from '@/lib/types';
import { usd, gain, pct, age } from '@/lib/format';

export const revalidate = 180;
export const maxDuration = 60;

const MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function findCoin(address) {
  const meta = await getMeta();
  const r = meta.runners.find((x) => x.address === address);
  if (r) return { meta, r, runner: true };
  // Not one of today's runners: show its basic numbers so old links still work.
  const pairs = await resolveTokens([address], { revalidate: 120 });
  const p = pairs.get(address);
  if (!p) return { meta, r: null };
  const createdAt = p.pairCreatedAt || 0;
  return {
    meta,
    runner: false,
    r: {
      address, name: p.baseToken.name, symbol: p.baseToken.symbol, image: p.info?.imageUrl || '', url: p.url, pairAddress: p.pairAddress,
      launchpad: p.dexId, marketCap: p.marketCap || p.fdv || 0, liquidity: p.liquidity?.usd || 0, priceUsd: Number(p.priceUsd) || 0,
      change: { h1: p.priceChange?.h1 ?? null, h6: p.priceChange?.h6 ?? null, h24: p.priceChange?.h24 ?? null },
      volume24h: p.volume?.h24 || 0, buys24h: p.txns?.h24?.buys || 0, sells24h: p.txns?.h24?.sells || 0,
      ageHours: createdAt ? (Date.now() - createdAt) / 3600000 : null, socials: { x: '', website: '', telegram: '' }, type: 'meme', theme: 'other', top10: null,
    },
  };
}

export async function generateMetadata({ params }) {
  const { address } = await params;
  if (!MINT.test(address)) return { title: 'Coin' };
  const { r } = await findCoin(address);
  return r ? { title: `${r.name} ($${r.symbol})`, description: `${r.name} ($${r.symbol}): backstory, why it's trending and live numbers.` } : { title: 'Coin' };
}

export default async function CoinPage({ params }) {
  const { address } = await params;
  if (!MINT.test(address)) notFound();
  const { meta, r, runner } = await findCoin(address);
  if (!r) notFound();

  const [day, week, wireAll] = await Promise.all([
    r.pairAddress ? getCandles(r.pairAddress, { timeframe: 'minute', aggregate: 15, limit: 96, revalidate: 300 }) : [],
    r.pairAddress ? getCandles(r.pairAddress, { timeframe: 'hour', aggregate: 4, limit: 42, revalidate: 1800 }) : [],
    getWire(200).catch(() => []),
  ]);
  const wire = wireAll.filter((e) => e.address === address).slice(0, 8);
  const narratives = (meta.summary?.themes || []).filter((t) => t.addresses.includes(address));
  const themeObj = meta.stats.themes.find((t) => t.id === r.theme);
  const similar = meta.runners.filter((x) => x.address !== address && x.theme === r.theme && r.theme !== 'other').slice(0, 5);
  const buyShare = r.buys24h + r.sells24h ? r.buys24h / (r.buys24h + r.sells24h) : null;
  const t = typeById(r.type);

  return (
    <div className="wrap coinpage">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Today</Link>
        <span aria-hidden="true">/</span>
        <Link href="/#runners">Runners</Link>
        <span aria-hidden="true">/</span>
        <span>${r.symbol}</span>
      </nav>

      <header className="ch">
        <div className="ch-id">
          <CoinImg src={r.image} name={r.name} symbol={r.symbol} size={76} />
          <div>
            <h1>{r.name}</h1>
            <p className="ch-meta">
              <span>${r.symbol}</span>
              <span className="ch-type"><TypeBadge id={r.type} /> {t.name}</span>
              {themeObj && <span className="theme-tag" style={{ '--c': themeObj.color }}>{themeObj.name}</span>}
              <span>{age(r.ageHours)} old</span>
              <span>Launched on {r.launchpad}</span>
              {runner && <span>#{r.rank} of today&apos;s runners</span>}
            </p>
          </div>
        </div>
        <CoinLive r={r} />
      </header>

      {!runner && <p className="notice">This coin isn&apos;t one of today&apos;s runners, so there&apos;s no story for it right now. Live numbers are below.</p>}

      <LiveChart pairAddress={r.pairAddress} day={day} week={week} />

      <div className="coin-grid">
        <div className="coin-main">
          <CoinStory address={address} enabled={runner && meta.aiEnabled} why={r.why} />

          {narratives.length > 0 && (
            <section className="coin-sec" data-reveal="up">
              <h2 className="h3">In today&apos;s narratives</h2>
              <ul className="coin-narr">
                {narratives.map((n) => (
                  <li key={n.name}>
                    <Link href="/#narratives"><strong>{n.name}</strong></Link>
                    <span className={`heat heat-${n.heat}`}>{n.heat === 'rising' ? 'Rising' : n.heat === 'cooling' ? 'Cooling' : 'Holding'}</span>
                    <p>{n.take}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="coin-sec" data-reveal="up">
            <h2 className="h3">On the wire</h2>
            {wire.length ? (
              <ol className="wire wire-compact">
                {wire.map((e) => (
                  <li key={e.id} className={`wire-${e.type}`}>
                    <time dateTime={new Date(e.at).toISOString()}>{new Date(e.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })} ET</time>
                    <p><b>{r.name}</b> {e.text}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="note">No events for this coin yet. New ones appear here as it hits milestones or makes big moves.</p>
            )}
          </section>
        </div>

        <aside className="coin-side">
          <HolderStats address={address} />

          <dl className="kv">
            <div><dt>Market cap</dt><dd>{usd(r.marketCap)}</dd></div>
            <div><dt>Liquidity</dt><dd>{usd(r.liquidity)}</dd></div>
            <div><dt>Volume, 24h</dt><dd>{usd(r.volume24h)}</dd></div>
            {buyShare != null && <div><dt>Buys vs sells, 24h</dt><dd>{Math.round(buyShare * 100)}% buys</dd></div>}
            {r.change.m30 != null && <div><dt>30 minutes</dt><dd className={r.change.m30 >= 0 ? 'up' : 'down'}>{pct(r.change.m30)}</dd></div>}
            <div><dt>6 hours</dt><dd className={r.change.h6 >= 0 ? 'up' : 'down'}>{pct(r.change.h6)}</dd></div>
            {r.change.h12 != null && <div><dt>12 hours</dt><dd className={r.change.h12 >= 0 ? 'up' : 'down'}>{gain(r.change.h12)}</dd></div>}
            <div><dt>24 hours</dt><dd className={r.change.h24 >= 0 ? 'up' : 'down'}>{gain(r.change.h24)}</dd></div>
          </dl>

          <div className="coin-links">
            <a className="btn btn-ink btn-sm" href={r.url} target="_blank" rel="noopener noreferrer">DexScreener <Out width={15} height={15} /></a>
            <a className="btn btn-quiet btn-sm" href={`https://gmgn.ai/sol/token/${r.address}`} target="_blank" rel="noopener noreferrer">GMGN</a>
            {r.socials.x && <a className="btn btn-quiet btn-sm" href={r.socials.x} target="_blank" rel="noopener noreferrer nofollow"><XLogo /> X</a>}
            {r.socials.website && <a className="btn btn-quiet btn-sm" href={r.socials.website} target="_blank" rel="noopener noreferrer nofollow">Website</a>}
            {r.socials.telegram && <a className="btn btn-quiet btn-sm" href={r.socials.telegram} target="_blank" rel="noopener noreferrer nofollow">Telegram</a>}
          </div>
          <div className="coin-ca">
            <span className="note">Contract address</span>
            <code className="addr">{r.address}</code>
            <CopyText text={r.address} label="Copy" />
          </div>

          {similar.length > 0 && (
            <section className="coin-sim">
              <h2 className="h3">Also in {themeObj?.name}</h2>
              <ul>
                {similar.map((s) => (
                  <li key={s.address}>
                    <Link href={`/coin/${s.address}`}>
                      <CoinImg src={s.image} name={s.name} symbol={s.symbol} size={26} />
                      <span className="sim-name">{s.name}</span>
                      <span className={s.change.h24 >= 0 ? 'up' : 'down'}>{gain(s.change.h24)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
