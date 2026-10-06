export type TipState = { x: number; y: number; value: string; label: string } | null;

/** Value leads, label follows. Positioned relative to the chart box. */
export function Tip({ tip }: { tip: TipState }) {
  if (!tip) return null;
  return (
    <div className="tip" style={{ left: tip.x, top: tip.y }} role="status">
      <strong>{tip.value}</strong>
      <br />
      <span className="tip-sub">{tip.label}</span>
    </div>
  );
}
