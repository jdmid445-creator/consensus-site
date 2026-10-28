export function usd(n) {
  if (n == null || !isFinite(n)) return '–';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

export function pct(n, { sign = true } = {}) {
  if (n == null || !isFinite(n)) return '–';
  const v = Math.abs(n) >= 1000 ? `${Math.round(n / 100) / 10}K` : Math.abs(n) >= 100 ? Math.round(n) : n.toFixed(1);
  return `${sign && n > 0 ? '+' : ''}${v}%`;
}

export function share(x) {
  return `${Math.round((x || 0) * 100)}%`;
}

export function age(hours) {
  if (hours == null) return '–';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export function initials(name, symbol) {
  const s = (symbol || name || '?').replace(/[^A-Za-z0-9]/g, '');
  return (s.slice(0, 2) || '?').toUpperCase();
}
