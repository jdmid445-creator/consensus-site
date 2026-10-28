import Link from 'next/link';
import Mark from './Mark';
import { XLogo } from './Icons';
import { site } from '@/lib/site';

export default function Header() {
  return (
    <header className="top">
      <div className="wrap top-in">
        <Link href="/" className="brand" aria-label={`${site.name} home`}>
          <Mark size={26} />
          <span>{site.name}</span>
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/#latest">Latest</Link>
          <Link href="/#movers">Movers</Link>
          <Link href="/#narratives" className="hide-sm">Narratives</Link>
          <Link href="/#runners" className="hide-sm">All coins</Link>
          <Link href="/#write" className="hide-sm">Write</Link>
          <Link href="/docs">Docs</Link>
          {site.links.x && (
            <a href={site.links.x} target="_blank" rel="noopener noreferrer" className="nav-icon" aria-label={`${site.name} on X`}>
              <XLogo />
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
