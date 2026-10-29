import './globals.css';
import AppNav from '@/components/AppNav';
import Search from '@/components/Search';
import MarketStrip from '@/components/MarketStrip';
import { getMarkets } from '@/lib/markets';
import Reveal from '@/components/Reveal';
import { site } from '@/lib/site';
import { XLogo } from '@/components/Icons';
import { xTopEnabled } from '@/lib/xtop';

export const metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `${site.name} · %s` },
  description: site.description,
  openGraph: { title: site.name, description: site.tagline, url: site.url, siteName: site.name, type: 'website' },
  twitter: { card: 'summary_large_image', title: site.name, description: site.tagline },
};

export const viewport = { themeColor: '#0D1421', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function RootLayout({ children }) {
  const markets = await getMarkets().catch(() => []);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/supreme-500.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/supreme-700.woff2" as="font" type="font/woff2" crossOrigin="" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <a href="#main" className="sr-only skip">Skip to content</a>
        <div className="app">
          <AppNav name={site.name} ca={site.ca} ticker={site.ticker} x={site.links.x} xFeed={xTopEnabled()}>
            <Search />
          </AppNav>
          {markets.length > 0 && <MarketStrip markets={markets} />}
          <main id="main">{children}</main>
          <footer className="ftr">
            <span>{site.name}. Data from DexScreener, GeckoTerminal and Helius. Not financial advice.</span>
            <span className="ftr-links">
              <a href={site.links.x} target="_blank" rel="noopener noreferrer"><XLogo width={13} height={13} /> @{site.links.x.split('/').pop()}</a>
              <a href="/docs">Docs</a>
            </span>
          </footer>
        </div>
        <Reveal />
      </body>
    </html>
  );
}
