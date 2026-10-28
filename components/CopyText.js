'use client';

import { useState } from 'react';
import { Copy, Check } from './Icons';

export default function CopyText({ text, label = 'Copy', done = 'Copied', className = 'btn btn-quiet btn-sm' }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1600);
        } catch {}
      }}
    >
      {ok ? <Check /> : <Copy />}
      <span>{ok ? done : label}</span>
    </button>
  );
}
