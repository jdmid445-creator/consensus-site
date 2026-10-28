'use client';

import { useState } from 'react';
import { initials } from '@/lib/format';

// A coin's own logo, falling back to its initials on the theme color if the image is missing.
export default function CoinImg({ src, name, symbol, color = '#8A93A0', size = 32, className = '' }) {
  const [broken, setBroken] = useState(!src);
  const style = { width: size, height: size, '--c': color };
  if (broken) {
    return (
      <span className={`coin coin-fallback ${className}`} style={style} aria-hidden="true">
        <span style={{ fontSize: Math.max(9, size * 0.34) }}>{initials(name, symbol)}</span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`coin ${className}`}
      style={style}
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}
