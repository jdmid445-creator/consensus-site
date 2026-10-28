// A plain keyword pass that sorts runners into themes from their name, ticker and
// description. It always works (no AI needed) and gives the AI a starting point.
// The AI read on top of this is what names today's specific narratives.
export const THEMES = [
  { id: 'animals', name: 'Animals', color: '#E0882B',
    words: ['dog', 'doge', 'inu', 'shib', 'pup', 'puppy', 'cat', 'kitty', 'meow', 'frog', 'pepe', 'toad', 'monkey', 'ape', 'chimp', 'penguin', 'pengu', 'hamster', 'hippo', 'moodeng', 'goat', 'bear', 'bull', 'fish', 'whale', 'duck', 'bird', 'owl', 'capybara', 'raccoon', 'otter', 'squirrel', 'rat', 'mouse', 'lion', 'tiger', 'wolf', 'fox', 'bunny', 'rabbit', 'snail', 'turtle', 'shark', 'pig', 'cow', 'horse', 'donkey', 'deer', 'koala', 'panda', 'sloth', 'gorilla', 'lizard', 'dragon', 'crab', 'octopus', 'bee', 'ant', 'beaver'] },
  { id: 'ai', name: 'AI & agents', color: '#3F63D9',
    words: ['ai', 'agent', 'agents', 'gpt', 'llm', 'bot', 'robot', 'neural', 'sentient', 'agi', 'model', 'claude', 'grok', 'compute', 'autonomous', 'terminal', 'singularity', 'digital', 'virtual'] },
  { id: 'politics', name: 'Politics & headlines', color: '#C2410C',
    words: ['trump', 'maga', 'biden', 'president', 'election', 'vote', 'congress', 'senate', 'tariff', 'war', 'nato', 'usa', 'america', 'china', 'russia', 'elon', 'doge', 'government', 'fed', 'news', 'breaking', 'law', 'court', 'freedom'] },
  { id: 'people', name: 'People & creators', color: '#B83280',
    words: ['streamer', 'kick', 'twitch', 'youtuber', 'tiktok', 'influencer', 'rapper', 'singer', 'celebrity', 'ceo', 'founder', 'kid', 'guy', 'girl', 'man', 'woman', 'boy', 'dad', 'mom', 'grandma', 'uncle', 'wife', 'husband'] },
  { id: 'culture', name: 'Internet culture', color: '#7C3AED',
    words: ['meme', 'brainrot', 'skibidi', 'rizz', 'sigma', 'based', 'wojak', 'chad', 'npc', 'lol', 'lmao', 'bruh', 'vibe', 'aura', 'cope', 'giga', 'goon', 'troll', 'viral', 'trend', 'gen', 'zoomer', 'boomer', 'clown', 'fart', 'butt', 'poop'] },
  { id: 'crypto', name: 'Crypto & CT lore', color: '#0F766E',
    words: ['sol', 'solana', 'pump', 'moon', 'hodl', 'degen', 'wagmi', 'gm', 'jeet', 'rug', 'chart', 'cabal', 'bonk', 'jup', 'ray', 'bags', 'trench', 'trenches', 'ct', 'bitcoin', 'btc', 'eth', 'airdrop', 'cto', 'dev', 'mint', 'onchain', 'token', 'coin', 'wallet', 'crypto'] },
  { id: 'entertainment', name: 'Anime, games & film', color: '#DB2777',
    words: ['anime', 'manga', 'waifu', 'game', 'gaming', 'pixel', 'mario', 'pokemon', 'nintendo', 'minecraft', 'roblox', 'fortnite', 'movie', 'film', 'show', 'cartoon', 'hero', 'villain', 'ninja', 'samurai', 'wizard', 'magic', 'quest'] },
  { id: 'food', name: 'Food & drink', color: '#CA8A04',
    words: ['pizza', 'burger', 'taco', 'sushi', 'ramen', 'noodle', 'bread', 'cheese', 'banana', 'apple', 'cookie', 'cake', 'donut', 'coffee', 'tea', 'beer', 'wine', 'milk', 'egg', 'potato', 'chicken', 'bacon', 'fries', 'snack', 'candy', 'chips'] },
  { id: 'science', name: 'Science & space', color: '#0284C7',
    words: ['space', 'mars', 'nasa', 'rocket', 'planet', 'galaxy', 'alien', 'ufo', 'quantum', 'atom', 'science', 'lab', 'gene', 'cell', 'brain', 'physics', 'star', 'cosmic', 'satellite', 'asteroid'] },
  { id: 'spirit', name: 'Faith & the mystical', color: '#65A30D',
    words: ['god', 'jesus', 'christ', 'church', 'bible', 'angel', 'devil', 'demon', 'heaven', 'hell', 'pray', 'holy', 'cult', 'ritual', 'occult', 'oracle', 'prophecy', 'zen', 'karma', 'soul', 'spirit'] },
];

export const OTHER = { id: 'other', name: 'One-offs', color: '#6B7280' };

const index = new Map();
for (const t of THEMES) for (const w of t.words) if (!index.has(w)) index.set(w, t.id);

function tokens(text) {
  return (text || '')
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// Name and ticker count three times as much as the description.
export function classify({ name, symbol, description }) {
  const score = new Map();
  const bump = (words, w) => {
    for (const tok of words) {
      let id = index.get(tok);
      // also catch compounds like "catwifhat" or "dogcoin"
      if (!id && tok.length > 5) for (const [k, v] of index) if (k.length >= 4 && (tok.startsWith(k) || tok.endsWith(k))) { id = v; break; }
      if (id) score.set(id, (score.get(id) || 0) + w);
    }
  };
  bump(tokens(`${name} ${symbol}`), 3);
  bump(tokens(description).slice(0, 80), 1);
  let best = OTHER.id, top = 0;
  for (const [id, s] of score) if (s > top) { best = id; top = s; }
  return best;
}

export const themeById = (id) => THEMES.find((t) => t.id === id) || OTHER;
