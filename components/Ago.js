'use client';

import { useEffect, useState } from 'react';

// "Updated 3 min ago", kept current in the browser.
export default function Ago({ at, prefix = 'Updated' }) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!at) return null;
  const mins = now ? Math.max(0, Math.round((now - at) / 60000)) : null;
  const text = mins == null ? '' : mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} h ago`;
  return <time dateTime={new Date(at).toISOString()}>{prefix} {text}</time>;
}
