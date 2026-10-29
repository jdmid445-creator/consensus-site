'use client';

import { useEffect, useRef, useState } from 'react';
import { initials } from '@/lib/format';

// Token CDN images go through /api/img so they load from our own domain.
export const proxied = (src) => (src && /^https:\/\//.test(src) ? `/api/img?u=${encodeURIComponent(src)}` : src);

// A coin's own logo, found no matter what: our image proxy first, then the image's own address,
// then /api/logo (which looks the coin up on DexScreener, its launch metadata, GeckoTerminal and
// pump.fun). Only if all of that fails do the coin's initials show.
const HTTPS = /^https:\/\//;
export default function CoinImg({ src, address, name, symbol, color = '#8A93A0', size = 32, className = '' }) {
  const start = () => (src ? 0 : address ? 2 : 3);
  const [stage, setStage] = useState(start); // 0 proxy, 1 direct, 2 lookup, 3 initials
  const ref = useRef(null);
  const fail = () => setStage((s) => {
    if (s === 0 && HTTPS.test(src || '')) return 1;
    if (s < 2 && address) return 2;
    return 3;
  });
  useEffect(() => { setStage(start()); }, [src, address]); // eslint-disable-line react-hooks/exhaustive-deps
  // An image can fail before React hydrates and attaches onError; catch that case too.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) fail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);
  // A load that hangs (a dead host) moves on to the next option after a few seconds.
  useEffect(() => {
    if (stage === 3) return;
    const t = setTimeout(() => { const img = ref.current; if (!img || !img.complete || img.naturalWidth === 0) fail(); }, stage === 2 ? 12000 : stage === 0 ? 6000 : 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);
  const broken = stage === 3;
  const url = stage === 0 ? proxied(src) : stage === 1 ? src : `/api/logo?a=${address}`;
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
      src={url}
      referrerPolicy="no-referrer"
      alt=""
      width={size}
      height={size}
      decoding="async"
      onError={fail}
    />
  );
}
