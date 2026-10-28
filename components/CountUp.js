'use client';

import { useEffect, useRef, useState } from 'react';
import { usd, pct, gain, age } from '@/lib/format';

const FORMATS = {
  usd,
  pct: (v) => pct(v),
  gain,
  age,
  share: (v) => `${Math.round((v || 0) * 100)}%`,
  int: (v) => Math.round(v || 0).toLocaleString('en-US'),
};

// A number that counts up from zero the first time it scrolls into view.
// Rendered at its final value on the server, so it reads right with no JavaScript.
export default function CountUp({ value, kind = 'int', className = '' }) {
  const fmt = FORMATS[kind] || FORMATS.int;
  const ref = useRef(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof value !== 'number' || !isFinite(value)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight) return; // already on screen at load: leave it as is
    setShown(0);
    let raf;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t) => {
        const k = Math.min(1, (t - t0) / 900);
        setShown(value * (1 - Math.pow(1 - k, 3)));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);

  return <b ref={ref} className={className}>{fmt(shown)}</b>;
}
