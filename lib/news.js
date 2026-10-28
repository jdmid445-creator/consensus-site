// Crypto headlines from the major outlets' public RSS feeds: title, link, outlet and time only
// (we link out to read the story). Refreshed every 10 minutes; a dead feed is just skipped.
const FEEDS = [
  { source: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { source: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
  { source: 'Decrypt', url: 'https://decrypt.co/feed' },
  { source: 'The Block', url: 'https://www.theblock.co/rss.xml' },
  { source: 'Blockworks', url: 'https://blockworks.co/feed' },
];

const SOLANA = /\b(solana|sol|memecoins?|meme coins?|pump\.?fun|bonk|wif|jupiter|raydium|phantom|letsbonk|launchpads?)\b/i;

const decode = (s) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#8217;|&#039;|&#39;|&apos;/g, '’').replace(/&#8216;/g, '‘').replace(/&#8220;/g, '“').replace(/&#8221;/g, '”')
    .replace(/&#8211;/g, '–').replace(/&#8212;/g, '—').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ').trim();

const tag = (xml, name) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1] || '';

async function readFeed({ source, url }) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/rss+xml, application/xml, text/xml' }, next: { revalidate: 600 } });
    clearTimeout(t);
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
    return items.slice(0, 15).map((it) => {
      const title = decode(tag(it, 'title'));
      let link = decode(tag(it, 'link')) || (it.match(/<guid[^>]*>(https?:[^<]+)<\/guid>/i)?.[1] || '');
      const when = Date.parse(decode(tag(it, 'pubDate')) || decode(tag(it, 'dc:date')));
      if (!/^https:\/\//.test(link)) link = '';
      return { source, title, link, at: isFinite(when) ? when : null, solana: SOLANA.test(title) };
    }).filter((x) => x.title && x.link);
  } catch {
    return [];
  }
}

export async function getHeadlines(limit = 12) {
  const all = (await Promise.all(FEEDS.map(readFeed))).flat();
  const seen = new Set();
  const unique = all.filter((x) => {
    const k = x.title.toLowerCase().slice(0, 60);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  unique.sort((a, b) => (b.at || 0) - (a.at || 0));
  return unique.slice(0, limit);
}
