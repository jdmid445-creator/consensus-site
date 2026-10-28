// The mark: a 3×3 field of tiles where one row lines up solid. Many coins, one line of agreement.
export default function Mark({ size = 28, ink = 'currentColor' }) {
  const s = 6, g = 2;
  const cells = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) {
      const x = 2 + c * (s + g), y = 2 + r * (s + g);
      if (r === 1) continue;
      cells.push(<rect key={`${r}${c}`} x={x} y={y} width={s} height={s} rx="1.5" fill="none" stroke={ink} strokeWidth="1.6" />);
    }
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      {cells}
      <rect x="2" y="10" width="22" height="6" rx="1.5" fill={ink} />
    </svg>
  );
}
