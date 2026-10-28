// The mark: three bars of falling length, a leaderboard and speed lines in one.
export default function Mark({ size = 28, ink = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect x="3" y="5" width="22" height="4.5" rx="2.25" fill={ink} />
      <rect x="3" y="11.75" width="15.5" height="4.5" rx="2.25" fill={ink} opacity=".72" />
      <rect x="3" y="18.5" width="9" height="4.5" rx="2.25" fill={ink} opacity=".45" />
    </svg>
  );
}
