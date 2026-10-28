import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { site } from '@/lib/site';

export const metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}: the Solana memecoin meta, read daily`, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: { title: site.name, description: site.tagline, url: site.url, siteName: site.name, type: 'website' },
  twitter: { card: 'summary_large_image', title: site.name, description: site.tagline },
};

export const viewport = { themeColor: '#ECEFF2', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap" />
      </head>
      <body>
        <a href="#main" className="sr-only skip">Skip to content</a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
