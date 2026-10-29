'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Mark from './Mark';
import CopyText from './CopyText';
import { Home, List, Pen, Book, XLogo } from './Icons';

const ITEMS = [
  { href: '/', label: 'Dashboard', short: 'Home', Icon: Home },
  { href: '/coins', label: 'All coins', short: 'Coins', Icon: List },
  { href: '/write', label: 'Write a narrative', short: 'Write', Icon: Pen },
  { href: '/docs', label: 'Docs', short: 'Docs', Icon: Book },
];

// The app's navigation: a sidebar on wide screens, a tab bar along the bottom on phones.
export default function AppNav({ name, ca, ticker, x }) {
  const path = usePathname() || '/';
  const on = (href) => (href === '/' ? path === '/' : path.startsWith(href));
  return (
    <>
      <aside className="side" aria-label="Main">
        {/* A plain link so clicking the name always reloads the page fresh. */}
        <a href="/" className="brand">
          <Mark size={26} />
          <span>{name}</span>
        </a>
        <nav className="side-nav">
          {ITEMS.map(({ href, label, Icon }) => (
            <Link key={href} href={href} className="side-item" aria-current={on(href) ? 'page' : undefined}>
              <Icon width={18} height={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          {ca && (
            <div className="side-ca">
              <span>{ticker ? `${ticker} contract` : 'Contract'}</span>
              <CopyText text={ca} label="Copy CA" />
            </div>
          )}
          {x && <a href={x} target="_blank" rel="noopener noreferrer" className="side-x"><XLogo /> Follow on X</a>}
          <p>Data from DexScreener, GeckoTerminal and Helius. Not financial advice.</p>
        </div>
      </aside>

      <nav className="tabbar" aria-label="Main">
        {ITEMS.map(({ href, short, Icon }) => (
          <Link key={href} href={href} className="tab-item" aria-current={on(href) ? 'page' : undefined}>
            <Icon width={21} height={21} />
            <span>{short}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
