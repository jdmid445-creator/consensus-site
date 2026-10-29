'use client';

import { useEffect, useRef, useState } from 'react';
import { initials } from '@/lib/format';

// Token CDN images go through /api/img so they load from our own domain.
export const proxied = (src) => (src && /^https:\/\//.test(src) ? `/api/img?u=${encodeURIComponent(src)}` : src);

// A coin's own logo. Tries our proxy first, then the image's own address, and only shows the
// coin's initials if both fail (or there's no logo at all).
export default function CoinImg({ src, name, symbol, color = '#8A93A0', size = 32, className = '' }) {
  const [stage, setStage] = useState(src ? 0 : 2); // 0 proxy, 1 direct, 2 initials
  const ref = useRef(null);
  const fail = () => setStage((s) => (s === 0 && /^https:\/\//.test(src || '') ? 1 : 2));
  useEffect(() => { setStage(src ? 0 : 2); }, [src]);
  // An image can fail before React hydrates and attaches onError; catch that case too.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) fail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);
  const broken = stage === 2;
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
      src={stage === 0 ? proxied(src) : src}
      referrerPolicy="no-referrer"
      alt=""
      width={size}
      height={size}
      decoding="async"
      onError={fail}
    />
  );
}
