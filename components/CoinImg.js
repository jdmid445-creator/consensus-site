'use client';

import { useEffect, useRef, useState } from 'react';
import { initials } from '@/lib/format';

// Token CDN images go through /api/img so they load from our own domain.
export const proxied = (src) => (src && /^https:\/\//.test(src) ? `/api/img?u=${encodeURIComponent(src)}` : src);

// A coin's own logo, falling back to its initials if the image is missing or fails.
export default function CoinImg({ src, name, symbol, color = '#8A93A0', size = 32, className = '' }) {
  const [broken, setBroken] = useState(!src);
  const ref = useRef(null);
  // An image can fail before React hydrates and attaches onError; catch that case too.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setBroken(true);
  }, []);
  const style = { width: size, height: size, '--c': color };
  if (broken) {
    return (
      <span className={`coin coin-fallback ${className}`} style={style} aria-hidden="true">
        <span style={{ fontSize: Math.max(9, size * 0.36) }}>{initials(name, symbol)}</span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      className={`coin ${className}`}
      style={style}
      src={proxied(src)}
      alt=""
      width={size}
      height={size}
      decoding="async"
      onError={() => setBroken(true)}
    />
  );
}
