// Small custom icon set: 1.75px strokes, square caps, drawn on a 20px grid.
const base = { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'square', strokeLinejoin: 'miter', 'aria-hidden': true };

export const Rising = (p) => <svg {...base} {...p}><path d="M4 14l5-5 3 3 4-5" /><path d="M12 7h4v4" /></svg>;
export const Cooling = (p) => <svg {...base} {...p}><path d="M4 6l5 5 3-3 4 5" /><path d="M12 13h4V9" /></svg>;
export const Steady = (p) => <svg {...base} {...p}><path d="M3 10h14" /><path d="M13 6l4 4-4 4" /></svg>;
export const Out = (p) => <svg {...base} {...p}><path d="M8 5H5v10h10v-3" /><path d="M11 4h5v5" /><path d="M16 4l-7 7" /></svg>;
export const Copy = (p) => <svg {...base} {...p}><rect x="7" y="7" width="9" height="9" /><path d="M4 13V4h9" /></svg>;
export const Check = (p) => <svg {...base} {...p}><path d="M4 10.5l4 4 8-9" /></svg>;
export const Spark = (p) => <svg {...base} {...p}><path d="M10 2v5M10 13v5M2 10h5M13 10h5" /><path d="M5 5l2 2M13 13l2 2M15 5l-2 2M5 15l2-2" /></svg>;
export const Redo = (p) => <svg {...base} {...p}><path d="M15 4v4h-4" /><path d="M15 8a6 6 0 1 0 1 5" /></svg>;
export const XLogo = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" {...p}>
    <path fill="currentColor" d="M18.9 2H22l-7.2 8.2L23.3 22h-6.6l-5.2-6.8L5.5 22H2.4l7.7-8.8L1.9 2h6.8l4.7 6.2L18.9 2Zm-1.2 18h1.8L7.6 3.9H5.7L17.7 20Z" />
  </svg>
);
export const Sort = ({ dir, ...p }) => (
  <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true" {...p}>
    <path d="M5 1L1.5 5h7z" fill={dir === 'asc' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
    <path d="M5 11L1.5 7h7z" fill={dir === 'desc' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
  </svg>
);
export const Whale = (p) => (
  <svg {...base} {...p}>
    <path d="M2.5 10.5c0 3.2 2.8 5 6.5 5h3.5c3 0 4.5-2 4.5-4.5V9l1.5-3-3 1.2c-.8-.5-1.6-.5-2.2.3L12.5 10H5c-1.2 0-2 .1-2.5.5Z" />
    <path d="M7 7V4.5M5 5.3 7 4.5l2 .8" />
    <path d="M5.5 12.5h.01" />
  </svg>
);
export const Bars = (p) => <svg {...base} {...p}><path d="M4 16V9M8 16V5M12 16v-5M16 16V7" /></svg>;
export const People = (p) => <svg {...base} {...p}><circle cx="7.5" cy="7" r="2.5" /><path d="M3 16c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" /><path d="M13 5a2.5 2.5 0 0 1 0 5M14.5 12.3c1.6.5 2.5 1.8 2.5 3.7" /></svg>;
export const Page = (p) => <svg {...base} {...p}><path d="M5 3h7l3 3v11H5Z" /><path d="M8 9h4M8 12h4" /></svg>;
export const Pulse = (p) => <svg {...base} {...p}><path d="M2 10h4l2-5 4 10 2-5h4" /></svg>;
export const Gauge = (p) => <svg {...base} {...p}><path d="M3 14a7 7 0 1 1 14 0" /><path d="M10 14l3.5-4" /><path d="M3 17h14" /></svg>;
export const Home = (p) => <svg {...base} {...p}><path d="M3 9.5 10 4l7 5.5V17H3Z" /><path d="M8 17v-5h4v5" /></svg>;
export const List = (p) => <svg {...base} {...p}><path d="M7 5h10M7 10h10M7 15h10" /><path d="M3 5h1M3 10h1M3 15h1" /></svg>;
export const Pen = (p) => <svg {...base} {...p}><path d="M4 16l1-4 8.5-8.5 3 3L8 15Z" /><path d="M12 5l3 3" /></svg>;
export const Book = (p) => <svg {...base} {...p}><path d="M4 4h5a2 2 0 0 1 2 2v11a2 2 0 0 0-2-2H4Z" /><path d="M16 4h-3a2 2 0 0 0-2 2" /><path d="M16 4v11h-3" /></svg>;
export const Search = (p) => <svg {...base} {...p}><circle cx="8.5" cy="8.5" r="5" /><path d="M12.5 12.5 17 17" /></svg>;
export const Puzzle = (p) => <svg {...base} {...p}><rect x="3" y="3" width="6" height="6" /><rect x="11" y="3" width="6" height="6" /><rect x="3" y="11" width="6" height="6" /><rect x="11" y="11" width="6" height="6" /></svg>;
