'use client';

import { useEffect, useRef, useState } from 'react';

// A number that briefly tints green or red when a live update moves it.
export default function LiveNumber({ value, format, className = '' }) {
  const prev = useRef(value);
  const [dir, setDir] = useState(null);
  useEffect(() => {
    if (typeof value === 'number' && typeof prev.current === 'number' && value !== prev.current) {
      setDir(value > prev.current ? 'up' : 'down');
      const t = setTimeout(() => setDir(null), 1100);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);
  return <span className={`live-num ${dir ? `tick-${dir}` : ''} ${className}`}>{format(value)}</span>;
}
