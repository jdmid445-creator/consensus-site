const ago = (at) => {
  if (!at) return '';
  const m = Math.max(1, Math.round((Date.now() - at) / 60000));
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

// Crypto headlines from the major outlets: titles link out to the original story.
export default function Headlines({ items }) {
  if (!items.length) return <p className="wire-empty">Headlines from the major crypto outlets show up here. None came through on this refresh.</p>;
  return (
    <ol className="heads">
      {items.map((h) => (
        <li key={h.link}>
          <a href={h.link} target="_blank" rel="noopener noreferrer">
            <span className="heads-title">{h.title}</span>
            <span className="heads-meta">
              <span>{h.source}</span>
              {h.at && <span>{ago(h.at)}</span>}
              {h.solana && <span className="heads-tag">Solana</span>}
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
}
