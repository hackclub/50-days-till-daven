"use client";

import { useState } from "react";
import { Tip, type TipState } from "./Tip";

type Props = {
  values: number[];
  labels: string[];
  /** which labels to print under the axis; the rest live in the tooltip */
  showLabel?: (i: number) => boolean;
  unit?: [string, string];
  highlight?: number;
  ariaLabel: string;
};

/** Single-series columns: 4px rounded data end, square baseline, hover per column. */
export function Columns({ values, labels, showLabel = () => true, unit = ["signup", "signups"], highlight, ariaLabel }: Props) {
  const [tip, setTip] = useState<TipState>(null);
  const max = Math.max(1, ...values);

  const show = (i: number, el: HTMLElement) => {
    const box = el.parentElement!.parentElement!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const bar = el.firstElementChild!.getBoundingClientRect();
    setTip({
      x: r.left - box.left + r.width / 2,
      y: bar.top - box.top,
      value: `${values[i]} ${values[i] === 1 ? unit[0] : unit[1]}`,
      label: labels[i],
    });
  };

  return (
    <div className="cols-wrap">
      <div className="cols" role="list" aria-label={ariaLabel}>
        {values.map((v, i) => (
          <div
            key={i}
            className={`col${i === highlight ? " hl" : ""}`}
            role="listitem"
            tabIndex={0}
            aria-label={`${labels[i]}: ${v}`}
            onPointerEnter={(e) => show(i, e.currentTarget)}
            onClick={(e) => show(i, e.currentTarget)}
            onPointerLeave={() => setTip(null)}
            onFocus={(e) => show(i, e.currentTarget)}
            onBlur={() => setTip(null)}
          >
            <span className="col-bar" style={{ height: v ? `max(2px, ${(v / max) * 100}%)` : 0 }} />
          </div>
        ))}
      </div>
      <div className="cols-axis" aria-hidden="true">
        {labels.map((l, i) => (
          <span key={i}>{showLabel(i) ? l : ""}</span>
        ))}
      </div>
      <Tip tip={tip} />
    </div>
  );
}
