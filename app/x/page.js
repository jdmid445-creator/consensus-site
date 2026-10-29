import Link from 'next/link';
import { notFound } from 'next/navigation';
import Widget from '@/components/Widget';
import CoinImg from '@/components/CoinImg';
import AutoRefresh from '@/components/AutoRefresh';
import XFeed from '@/components/XFeed';
import { getMeta } from '@/lib/meta';
import { getXFeed, xFeedEnabled } from '@/lib/xfeed';
import { usd } from '@/lib/format';

export const revalidate = 60;
export const maxDuration = 60;
export const metadata = { title: 'X tracker' };

const k = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));

export default async function XTracker() {
  if (!xFeedEnabled()) notFound();
  const meta = await getMeta();
  const feed = await getXFeed(meta.runners);
  const byAddr = new Map(meta.runners.map((r) => [r.address, r]));
  const lite = (a) => { const r = byAddr.get(a); return r ? { address: r.address, name: r.name, symbol: r.symbol, image: r.image } : null; };
  const posts = (feed?.posts || []).map((p) => ({ ...p, coins: p.coins.map(lite).filter(Boolean) }));
  const talked = (feed?.coins || []).slice(0, 10).map((c) => ({ ...c, coin: byAddr.get(c.address) })).filter((c) => c.coin);
  const loud = (feed?.loudest || []).slice(0, 8);

  return (
    <div className="board-app">
      <AutoRefresh ms={60000} />
      <header className="page-head">
        <h1>X tracker</h1>
        <p className="muted">What X is saying about today&apos;s runners, newest first. Reposts, reply raids and paid-group promos are left out.</p>
      </header>
      <div className="row row-x">
        <Widget title="The feed" note={`${posts.length} posts`} className="wg-xfeed">
          <XFeed posts={posts} />
        </Widget>
        <div className="x-side">
          <Widget title="Most talked about" note="by accounts posting" className="wg-xtalk">
            {talked.length ? (
              <ol className="xt">
                {talked.map((c, i) => (
                  <li key={c.address}>
                    <Link href={`/coin/${c.address}`}>
                      <span className="xt-rank">{i + 1}</span>
                      <CoinImg address={c.address} src={c.coin.image} name={c.coin.name} symbol={c.coin.symbol} size={28} />
                      <span className="xt-name">{c.coin.name}<small>{c.posts} {c.posts === 1 ? 'post' : 'posts'} · {k(c.reach)} reach</small></span>
                      <b>{c.accounts}</b>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : <p className="muted x-empty">No posts about today&apos;s runners yet.</p>}
          </Widget>
          <Widget title="Biggest accounts posting" className="wg-xloud">
            {loud.length ? (
              <ul className="xl">
                {loud.map((a) => (
                  <li key={a.handle}>
                    <a href={`https://x.com/${a.handle}`} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.avatar} alt="" width={32} height={32} loading="lazy" />
                      <span className="xl-name">{a.name}<small>@{a.handle}</small></span>
                      <b>{k(a.followers)}</b>
                    </a>
                  </li>
                ))}
              </ul>
            ) : <p className="muted x-empty">Nobody big yet.</p>}
          </Widget>
        </div>
      </div>
    </div>
  );
}
