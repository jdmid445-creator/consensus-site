'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Mark from './Mark';
import CopyText from './CopyText';
import { Home, List, Pen, Book, Puzzle, XLogo } from './Icons';

const ITEMS = [
  { href: '/', label: 'Dashboard', short: 'Home', Icon: Home },
  { href: '/coins', label: 'All coins', short: 'Coins', Icon: List },
  { href: '/games', label: 'Games', short: 'Games', Icon: Puzzle },
  { href: '/write', label: 'Write', short: 'Write', Icon: Pen },
  { href: '/docs', label: 'Docs', short: 'Docs', Icon: Book },
];

// The header: name, the pages, search, and the CA. On phones the pages move to a tab bar
// along the bottom.
export default function AppNav({ name, ca, ticker, x, xFeed = false, children }) {
  const items = xFeed ? [{ href: '/x', label: 'X tracker', short: 'X', Icon: XLogo }, ...ITEMS] : ITEMS;
  const path = usePathname() || '/';
  const on = (href) => (href === '/' ? path === '/' : path.startsWith(href));
  return (
    <>
      <header className="hdr">
        <div className="hdr-in">
          {/* A plain link so clicking the name always reloads the page fresh. */}
          <a href="/" className="brand">
            <Mark size={24} />
            <span>{name}</span>
          </a>
          <nav className="hdr-nav" aria-label="Main">
            {items.map(({ href, label }) => (
              <Link key={href} href={href} className="hdr-link" aria-current={on(href) ? 'page' : undefined}>{label}</Link>
            ))}
          </nav>
          <div className="hdr-tools">
            {children}
            {ca && <CopyText text={ca} label={ticker ? `${ticker} CA` : 'CA'} />}
            {x && <a href={x} target="_blank" rel="noopener noreferrer" className="hdr-x" aria-label={`${name} on X`}><XLogo /></a>}
          </div>
        </div>
      </header>

      <nav className="tabbar" aria-label="Main">
        {items.map(({ href, short, Icon }) => (
          <Link key={href} href={href} className="tab-item" aria-current={on(href) ? 'page' : undefined}>
            <Icon width={21} height={21} />
            <span>{short}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
