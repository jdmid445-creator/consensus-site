import { TYPES, typeById } from '@/lib/types';

// One small glyph per coin type. Drawn on a 16px grid, 1.6px strokes.
const s = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
const GLYPHS = {
  meme: <><circle cx="8" cy="8" r="5.5" {...s} /><path d="M5.6 9.4c.6 1 1.4 1.5 2.4 1.5s1.8-.5 2.4-1.5" {...s} /><circle cx="6" cy="6.6" r=".8" fill="currentColor" /><circle cx="10" cy="6.6" r=".8" fill="currentColor" /></>,
  utility: <><path d="M9.8 2.8a3.2 3.2 0 0 0-3.9 4.1L2.6 10.2a1.3 1.3 0 0 0 1.8 1.8l3.3-3.3a3.2 3.2 0 0 0 4.1-3.9l-1.9 1.9-1.6-.4-.4-1.6z" {...s} /></>,
  tweet: <><path d="M3 4.2C3 3.5 3.5 3 4.2 3h7.6c.7 0 1.2.5 1.2 1.2v5.1c0 .7-.5 1.2-1.2 1.2H7l-3 2.5v-2.5h0c-.6 0-1-.5-1-1.2z" {...s} /></>,
  ai: <><rect x="4" y="4" width="8" height="8" rx="1.5" {...s} /><path d="M6.5 2v2M9.5 2v2M6.5 12v2M9.5 12v2M2 6.5h2M2 9.5h2M12 6.5h2M12 9.5h2" {...s} /><rect x="6.5" y="6.5" width="3" height="3" rx=".5" fill="currentColor" /></>,
  news: <><path d="M3 3.5h8v9H4.5A1.5 1.5 0 0 1 3 11z" {...s} /><path d="M11 6h2v5.5a1 1 0 0 1-2 0M5 6h4M5 8.2h4M5 10.4h2.5" {...s} /></>,
  person: <><circle cx="8" cy="5.6" r="2.6" {...s} /><path d="M3.2 13.2c.6-2.4 2.5-3.8 4.8-3.8s4.2 1.4 4.8 3.8" {...s} /></>,
  cto: <><path d="M4 13.5V2.8M4 3h7.5l-1.6 2.4 1.6 2.4H4" {...s} /></>,
};

export function TypeIcon({ id, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      {GLYPHS[id] || GLYPHS.meme}
    </svg>
  );
}

export default function TypeBadge({ id }) {
  const t = typeById(id);
  return (
    <span className={`type type-${t.id}`} title={`${t.name}: ${t.blurb}`}>
      <TypeIcon id={t.id} size={14} />
      <span className="sr-only">{t.name}</span>
    </span>
  );
}

// The key: what each badge means, with how many runners are each type.
export function TypeKey({ counts = {} }) {
  return (
    <ul className="type-key" aria-label="Coin types">
      {TYPES.filter((t) => counts[t.id]).map((t) => (
        <li key={t.id} title={t.blurb}>
          <span className={`type type-${t.id}`}><TypeIcon id={t.id} size={14} /></span>
          {t.name} <span className="muted num">{counts[t.id]}</span>
        </li>
      ))}
    </ul>
  );
}
