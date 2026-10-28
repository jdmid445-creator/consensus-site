'use client';

import { useEffect, useRef, useState } from 'react';

// A number that rolls to its new value (up or down) and tints briefly when a live update moves it.
export default function LiveNumber({ value, format, className = '' }) {
  const prev = useRef(value);
  const [dir, setDir] = useState(null);
  useEffect(() => {
    if (typeof value === 'number' && typeof prev.current === 'number' && value !== prev.current) {
      const d = value > prev.current ? 'up' : 'down';
      prev.current = value;
      setDir(d);
      const t = setTimeout(() => setDir(null), 1200);
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);
  const text = format(value);
  return (
    <span className={`live-num ${dir ? `tick-${dir}` : ''} ${className}`}>
      <span key={text} className={dir ? `roll roll-${dir}` : undefined}>{text}</span>
    </span>
  );
}
