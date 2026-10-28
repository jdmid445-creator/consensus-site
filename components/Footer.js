import Link from 'next/link';
import Mark from './Mark';
import CopyText from './CopyText';
import { site } from '@/lib/site';

export default function Footer() {
  return (
    <footer className="foot">
      <div className="wrap foot-in">
        <div className="foot-brand">
          <Mark size={22} />
          <p>
            <strong>{site.name}</strong>
            <br />
            <span className="muted">Data from DexScreener and GeckoTerminal. Read by Claude. Not financial advice.</span>
          </p>
        </div>
        {site.ca && (
          <div className="foot-ca">
            <span className="muted small">{site.ticker ? `${site.ticker} contract` : 'Contract'}</span>
            <code className="addr">{site.ca}</code>
            <CopyText text={site.ca} label="Copy CA" />
          </div>
        )}
        <nav className="foot-nav" aria-label="Footer">
          <Link href="/docs">Docs</Link>
          <Link href="/api/meta">Public JSON</Link>
          {site.links.x && <a href={site.links.x} target="_blank" rel="noopener noreferrer">X</a>}
          {site.links.telegram && <a href={site.links.telegram} target="_blank" rel="noopener noreferrer">Telegram</a>}
          {site.links.dexscreener && <a href={site.links.dexscreener} target="_blank" rel="noopener noreferrer">Chart</a>}
        </nav>
      </div>
    </footer>
  );
}
