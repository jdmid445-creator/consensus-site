'use client';

import { useState } from 'react';

// Pictures from X: straight from X first, then through our image proxy, then a letter
// (for avatars) or nothing (for post images).
export default function XImg({ src, alt = '', name = '', size, className, avatar = false }) {
  const [step, setStep] = useState(src ? 0 : 2);
  if (step >= 2) {
    if (!avatar) return null;
    return <span className={`x-av-fallback ${className || ''}`} style={{ width: size, height: size, fontSize: size ? Math.round(size * 0.45) : undefined }} aria-hidden="true">{(name || '?').trim().charAt(0).toUpperCase()}</span>;
  }
  const url = step === 0 ? src : `/api/img?u=${encodeURIComponent(src)}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} width={size} height={size} className={className} loading="lazy" referrerPolicy="no-referrer" onError={() => setStep((s) => s + 1)} />
  );
}
