'use client';

import { useState } from 'react';
import { Copy, Check } from './Icons';

// The contract address with a one-tap copy, for the top of a coin page.
export default function CopyCA({ address }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className={`ca-btn ${ok ? 'is-copied' : ''}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(address);
          setOk(true);
          setTimeout(() => setOk(false), 1600);
        } catch {}
      }}
      aria-label={`Copy contract address ${address}`}
    >
      <span className="ca-label">CA</span>
      <span className="ca-addr">{address.slice(0, 6)}…{address.slice(-6)}</span>
      <span className="ca-icon">{ok ? <Check width={15} height={15} /> : <Copy width={15} height={15} />}</span>
      <span className="ca-done" aria-live="polite">{ok ? 'Copied' : ''}</span>
    </button>
  );
}
