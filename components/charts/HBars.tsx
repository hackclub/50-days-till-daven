/** Ranked horizontal bars with the value at the tip; every value is printed so no hover is needed. */
export function HBars({ rows, total }: { rows: { label: string; value: number }[]; total: number }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="hbars">
      {rows.map((r) => (
        <li key={r.label}>
          <span className="hbar-label">{r.label}</span>
          <span className="hbar-track">
            <span className="hbar" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="hbar-value num">
            {r.value}
            <span className="muted"> · {total ? Math.round((r.value / total) * 100) : 0}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
