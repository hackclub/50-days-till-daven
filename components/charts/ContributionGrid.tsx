"use client";

import { useState } from "react";
import { CHART_DAYS, HAVEN_DATE } from "@/lib/config";
import { chartDate, chartIndex, formatDay, PROGRAM_START_INDEX } from "@/lib/dates";
import { level, LEVEL_LABELS } from "@/lib/levels";
import { Tip, type TipState } from "./Tip";

const WEEKS = CHART_DAYS / 7;
const DOW = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** GitHub-style calendar: columns are weeks (Mon→Sun), shade is that day's signups. */
export function ContributionGrid({ days, todayIndex }: { days: number[]; todayIndex: number }) {
  const [tip, setTip] = useState<TipState>(null);
  const haven = chartIndex(HAVEN_DATE);

  const months = Array.from({ length: WEEKS }, (_, w) => {
    const d = chartDate(w * 7);
    const prev = w ? chartDate((w - 1) * 7) : null;
    return !prev || prev.slice(5, 7) !== d.slice(5, 7) ? MONTHS[+d.slice(5, 7) - 1] : "";
  });

  const describe = (i: number) => {
    const date = formatDay(chartDate(i));
    if (i >= haven) return { value: i === haven ? "Haven, day 1" : "Haven, day 2", label: date };
    const day = i - PROGRAM_START_INDEX + 1;
    const when = i < PROGRAM_START_INDEX ? "before day 1" : `day ${day} of 50`;
    if (i > todayIndex) return { value: "upcoming", label: `${date} · ${when}` };
    const n = days[i] ?? 0;
    return { value: `${n} ${n === 1 ? "signup" : "signups"}`, label: `${date} · ${when}` };
  };

  const show = (i: number, el: HTMLElement) => {
    const box = el.closest(".cal")!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setTip({ x: r.left - box.left + r.width / 2, y: r.top - box.top, ...describe(i) });
  };

  return (
    <div className="cal">
      <div className="cal-months" aria-hidden="true">
        {months.map((m, w) => (
          <span key={w}>{m}</span>
        ))}
      </div>
      <div className="cal-body">
        <div className="cal-dow" aria-hidden="true">
          {DOW.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="cal-grid" role="grid" aria-label="Signups per day">
          {Array.from({ length: CHART_DAYS }, (_, i) => {
            const cls = ["cell"];
            if (i >= haven) cls.push("haven");
            else if (i > todayIndex) cls.push("future");
            else cls.push(`l${level(days[i] ?? 0)}`);
            if (i < PROGRAM_START_INDEX) cls.push("pre");
            if (i === todayIndex) cls.push("today");
            const d = describe(i);
            return (
              <div
                key={i}
                className={cls.join(" ")}
                role="gridcell"
                tabIndex={i === todayIndex ? 0 : -1}
                aria-label={`${d.label}: ${d.value}`}
                onPointerEnter={(e) => show(i, e.currentTarget)}
                onClick={(e) => show(i, e.currentTarget)}
                onPointerLeave={() => setTip(null)}
                onFocus={(e) => show(i, e.currentTarget)}
                onBlur={() => setTip(null)}
              >
                {i >= haven && <span className="cell-daven" />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="cal-legend" aria-hidden="true">
        <span>less</span>
        {LEVEL_LABELS.map((l, k) => (
          <span key={l} className={`cell l${k}`} title={`${l} signups`} />
        ))}
        <span>more</span>
        <span className="cal-legend-gap" />
        <span className="cell future" /> <span>upcoming</span>
      </div>
      <Tip tip={tip} />
    </div>
  );
}
