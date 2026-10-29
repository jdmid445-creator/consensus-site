// The mark: a radar sweep with one blip, the coin it just picked up.
export default function Mark({ size = 28, ink = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="11.5" fill="none" stroke={ink} strokeWidth="2.2" />
      <circle cx="14" cy="14" r="5" fill="none" stroke={ink} strokeWidth="1.8" opacity=".45" />
      <path d="M14 14 L14 2.5 A11.5 11.5 0 0 1 24.6 9.6 Z" fill={ink} opacity=".28" />
      <path d="M14 14 L24.6 9.6" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="18.56" cy="7.24" r="1.6" fill={ink} />
    </svg>
  );
}
