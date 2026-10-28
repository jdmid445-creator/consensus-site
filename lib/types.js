// What kind of coin each runner is (separate from its theme/subject).
// A keyword pass gives a first guess; DexScreener's community-takeover list marks CTOs;
// the AI read assigns the final type when it runs.
export const TYPES = [
  { id: 'meme', name: 'Meme', blurb: 'A character, joke or idea. No product.' },
  { id: 'utility', name: 'Utility', blurb: 'Ships something: a launchpad, swap, bot, app or tool.' },
  { id: 'tweet', name: 'Tweet coin', blurb: 'Named after a post or moment that went viral.' },
  { id: 'ai', name: 'AI agent', blurb: 'An AI agent or AI-made character with its own account.' },
  { id: 'news', name: 'News', blurb: 'Rides a headline or real-world event.' },
  { id: 'person', name: 'Person', blurb: 'About a real person, streamer or creator.' },
  { id: 'cto', name: 'Community takeover', blurb: 'The original dev left and the community runs it.' },
];
export const TYPE_IDS = TYPES.map((t) => t.id);
export const typeById = (id) => TYPES.find((t) => t.id === id) || TYPES[0];

const WORDS = {
  utility: ['launchpad', 'swap', 'dex', 'bridge', 'bot', 'app', 'protocol', 'platform', 'tool', 'tools', 'staking', 'wallet', 'sdk', 'api', 'terminal', 'dapp', 'aggregator', 'exchange', 'utility', 'infra', 'privacy', 'payments', 'pay', 'cards', 'trading', 'sniper', 'analytics', 'dashboard', 'tracker', 'launch', 'perps', 'lending'],
  ai: ['agent', 'agents', 'ai', 'gpt', 'llm', 'autonomous', 'sentient', 'neural', 'agi'],
  tweet: ['tweet', 'tweeted', 'posted', 'viral', 'said', 'reply', 'replied'],
  news: ['breaking', 'news', 'announced', 'election', 'tariff', 'court', 'law', 'war', 'senate', 'president', 'fed'],
  person: ['streamer', 'youtuber', 'rapper', 'influencer', 'ceo', 'founder', 'kick', 'twitch', 'tiktoker'],
};

const words = (s) => (s || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

export function guessType({ name, symbol, description, cto }) {
  if (cto) return 'cto';
  const head = words(`${name} ${symbol}`);
  const body = words(description).slice(0, 80);
  const score = {};
  for (const [id, list] of Object.entries(WORDS)) {
    for (const w of head) if (list.includes(w)) score[id] = (score[id] || 0) + 3;
    for (const w of body) if (list.includes(w)) score[id] = (score[id] || 0) + 1;
  }
  if (/(x|twitter)\.com\/[^/]+\/status\//.test(description || '')) score.tweet = (score.tweet || 0) + 3;
  let best = 'meme', top = 1; // needs 2+ points to beat "meme"
  for (const [id, s] of Object.entries(score)) if (s > top) { best = id; top = s; }
  return best;
}
