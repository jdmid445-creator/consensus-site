'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Re-renders the page's server data (wire, headlines, narratives, board) in place every
// `ms` while the tab is visible, and right away when you come back to the tab.
export default function AutoRefresh({ ms = 120000 }) {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    const go = () => {
      if (document.visibilityState === 'visible' && Date.now() - last > ms * 0.9) {
        last = Date.now();
        router.refresh();
      }
    };
    const t = setInterval(go, Math.min(ms, 30000));
    document.addEventListener('visibilitychange', go);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', go); };
  }, [router, ms]);
  return null;
}
