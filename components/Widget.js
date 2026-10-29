import Link from 'next/link';

// One dashboard widget: a small title row (with an optional link) over its content.
export default function Widget({ title, note, action, href, id, className = '', children }) {
  return (
    <section id={id} className={`wg ${className}`} aria-label={typeof title === 'string' ? title : undefined}>
      {(title || action) && (
        <header className="wg-head">
          <h2>{title}{note && <span className="wg-note">{note}</span>}</h2>
          {action && href && (href.startsWith('/') ? <Link href={href} className="wg-link">{action}</Link> : <a href={href} className="wg-link">{action}</a>)}
        </header>
      )}
      {children}
    </section>
  );
}
