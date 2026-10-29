import './globals.css';
import AppNav from '@/components/AppNav';
import Search from '@/components/Search';
import MarketStrip from '@/components/MarketStrip';
import Mark from '@/components/Mark';
import { getMarkets } from '@/lib/markets';
import Reveal from '@/components/Reveal';
import { site } from '@/lib/site';

export const metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}: the news on today's Solana memecoins`, template: `%s, ${site.name}` },
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <a href="#main" className="sr-only skip">Skip to content</a>
        <div className="app">
          <AppNav name={site.name} ca={site.ca} ticker={site.ticker} x={site.links.x} />
          <div className="app-main">
            <div className="topbar">
              <a href="/" className="brand brand-sm" aria-label={`${site.name} home`}>
                <Mark size={24} />
                <span>{site.name}</span>
              </a>
              <Search />
            </div>
            {markets.length > 0 && <MarketStrip markets={markets} />}
            <main id="main">{children}</main>
          </div>
        </div>
        <Reveal />
      </body>
    </html>
  );
}
