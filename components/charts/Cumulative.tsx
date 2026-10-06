"use client";

import { useState } from "react";
import { CHART_DAYS, HAVEN_DATE, PROGRAM_START } from "@/lib/config";
import { chartDate, chartIndex, formatDay } from "@/lib/dates";
import { Tip, type TipState } from "./Tip";
import { useWidth } from "./useWidth";

const H = 200;
const PAD = { t: 16, r: 44, b: 26, l: 36 };

function niceTicks(max: number) {
  const raw = Math.max(1, max) / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw)!;
  const top = Math.ceil(Math.max(1, max) / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

/** Running total of signups across the whole window; one series, crosshair readout. */
export function Cumulative({ days, before, todayIndex }: { days: number[]; before: number; todayIndex: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const last = Math.min(todayIndex, CHART_DAYS - 1);
  const totals: number[] = [];
  days.forEach((d, i) => totals.push((totals[i - 1] ?? before) + d));
  const shown = totals.slice(0, last + 1);
  const ticks = niceTicks(shown[shown.length - 1] ?? 0);
  const yMax = ticks[ticks.length - 1];

  const iw = Math.max(10, width - PAD.l - PAD.r);
  const ih = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (i / (CHART_DAYS - 1)) * iw;
  const y = (v: number) => PAD.t + ih - (v / yMax) * ih;

  const line = shown.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = shown.length ? `${line}L${x(last).toFixed(1)},${y(0)}L${x(0)},${y(0)}Z` : "";
  const xLabels = [PROGRAM_START, "2026-10-15", "2026-11-01", HAVEN_DATE].map(chartIndex);
  const haven = chartIndex(HAVEN_DATE);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - PAD.l) / iw) * (CHART_DAYS - 1));
    setHover(i >= 0 && i <= last ? i : null);
  };

  const tip: TipState =
    hover === null
      ? null
      : {
          x: x(hover),
          y: y(shown[hover]) - 6,
          value: `${shown[hover]} total`,
          label: `${formatDay(chartDate(hover))} · +${days[hover]}`,
        };

  return (
    <div className="cum" ref={ref}>
      <svg
        width={width}
        height={H}
        role="img"
        aria-label={`Running total of signups, now ${shown[shown.length - 1] ?? 0}.`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={PAD.l + iw} y1={y(t)} y2={y(t)} className={t === 0 ? "axis" : "grid"} />
            <text x={PAD.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tick">
              {t.toLocaleString("en-US")}
            </text>
          </g>
        ))}
        {xLabels.map((i, k) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor={k === xLabels.length - 1 ? "end" : "middle"} className="tick">
            {i === haven ? "haven" : formatDay(chartDate(i)).toLowerCase()}
          </text>
        ))}
        <line x1={x(haven)} x2={x(haven)} y1={PAD.t} y2={PAD.t + ih} className="grid" />
        <path d={area} className="cum-area" />
        <path d={line} className="cum-line" />
        {shown.length > 0 && (
          <>
            <circle cx={x(last)} cy={y(shown[last])} r={4} className="cum-dot" />
            <text x={x(last) + 9} y={y(shown[last])} dy="0.32em" className="cum-end">
              {shown[last]}
            </text>
          </>
        )}
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} className="crosshair" />
            <circle cx={x(hover)} cy={y(shown[hover])} r={4} className="cum-dot" />
          </>
        )}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}
