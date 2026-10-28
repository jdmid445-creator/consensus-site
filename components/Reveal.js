'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Adds .is-in to anything marked data-reveal the first time it scrolls into view.
// The CSS only hides those elements once this script is running (html.js), so the page
// is fully readable without JavaScript, and nothing animates with reduced motion on.
export default function Reveal() {
  const path = usePathname();
  useEffect(() => {
    const els = [...document.querySelectorAll('[data-reveal]:not(.is-in)')];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [path]);
  return null;
}
