'use client';

import { useEffect, useRef, useState } from 'react';
import WhalesTab from './WhalesTab';
import { Bars, Whale, People, Page, Pulse } from './Icons';

const ICONS = { stats: Bars, whales: Whale, holders: People, story: Page, wire: Pulse };

// The tabs under a coin's chart. Each tab has its own link (#whales etc.) so it can be shared.
// Panels stay mounted so switching back is instant; the Whales tab only loads while it's open.
export default function CoinTabs({ address, tabs }) {
  const ids = tabs.map((t) => t.id);
  const [tab, setTab] = useState(ids[0]);
  const bar = useRef(null);

  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (ids.includes(h)) setTab(h);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (id) => {
    setTab(id);
    history.replaceState(null, '', `#${id}`);
    const top = bar.current?.getBoundingClientRect().top ?? 0;
    if (top < 60) bar.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onKey = (e) => {
    const i = ids.indexOf(tab);
    if (e.key === 'ArrowRight') pick(ids[(i + 1) % ids.length]);
    if (e.key === 'ArrowLeft') pick(ids[(i - 1 + ids.length) % ids.length]);
  };

  return (
    <div className="ctabs">
      <div className="ctabs-bar" ref={bar} role="tablist" aria-label="Coin details" onKeyDown={onKey}>
        {tabs.map((t) => {
          const Icon = ICONS[t.id];
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              className={`ctab ctab-${t.id}`}
              onClick={() => pick(t.id)}
            >
              {Icon && <Icon width={18} height={18} />}
              <span>{t.label}</span>
              {t.count != null && <small>{t.count}</small>}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div key={t.id} id={`panel-${t.id}`} role="tabpanel" aria-labelledby={`tab-${t.id}`} hidden={tab !== t.id} className="ctab-panel">
          {t.id === 'whales' ? <WhalesTab address={address} active={tab === 'whales'} /> : t.node}
        </div>
      ))}
    </div>
  );
}
