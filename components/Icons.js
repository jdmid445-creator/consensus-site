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
