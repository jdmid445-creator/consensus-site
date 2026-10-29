'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gain } from '@/lib/format';

// The one sentence in the summary that names today's #1. It follows the leader card,
// so the words and the card can never disagree.
export default function LeadLine({ initial }) {
  const [lead, setLead] = useState(initial);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.__mtLead) setLead(window.__mtLead);
    const on = (e) => setLead(e.detail);
    window.addEventListener('mt:lead', on);
    return () => window.removeEventListener('mt:lead', on);
  }, []);
  if (!lead) return null;
  return (
    <>
      <Link href={`/coin/${lead.address}`} className="lead-link">{lead.name}</Link> is today&apos;s biggest gainer
      {typeof lead.h24 === 'number' ? <>, <b className={lead.h24 >= 0 ? 'up' : 'down'}>{gain(lead.h24)}</b> in 24 hours</> : null}.{' '}
    </>
  );
}
