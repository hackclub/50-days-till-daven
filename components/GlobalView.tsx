"use client";

import Image from "next/image";
import { useState } from "react";
import { chartDate, formatDay, PROGRAM_START_INDEX } from "@/lib/dates";
import { inScope, type Scope } from "@/lib/scope";
import { computeStreak } from "@/lib/streak";
import type { EventSummary, GlobalStats } from "@/lib/types";
import { Breakdowns, medianAge } from "./Breakdowns";
import { Columns } from "./charts/Columns";
import { Cumulative } from "./charts/Cumulative";
import { HBars } from "./charts/HBars";
import { HeroNav } from "./HeroNav";
import { useNow } from "./useNow";

const TOP_COUNTRIES = 10;
const day = (i: number) => formatDay(chartDate(i));
const fmt = (n: number) => n.toLocaleString("en-US");
const SCOPES: { scope: Scope; label: string }[] = [
  { scope: "world", label: "World" },
  { scope: "us", label: "US" },
];

type Props = { stats: Record<Scope, GlobalStats>; events: EventSummary[]; generatedAt: number };

export function GlobalView({ stats, events: all, generatedAt }: Props) {
  const { now, tz } = useNow(generatedAt, 15_000);
  const [scope, setScope] = useState<Scope>("world");
  const g = stats[scope];
  const events = all.filter((e) => inScope(e.country, scope));
  const streaks = events.map((e) => computeStreak(e.days, e.tz, now));
  // every haven counts its own local day, so the latest day shown is the furthest-ahead haven's today
  const todayIndex = Math.max(PROGRAM_START_INDEX - 1, ...streaks.map((s) => s.todayIndex));
  const today = streaks.reduce((n, s) => n + s.today, 0);

  const programDays = g.days.slice(PROGRAM_START_INDEX, todayIndex + 1);
  let bestDay = -1;
  programDays.forEach((n, k) => {
    if (n > 0 && (bestDay < 0 || n > programDays[bestDay])) bestDay = k;
  });

  const byCountry = new Map<string, number>();
  for (const e of events) byCountry.set(e.country, (byCountry.get(e.country) ?? 0) + e.total);
  const countries = [...byCountry]
    .map(([label, value]) => ({ label, value }))
    .filter((r) => r.value > 0)
    .sort((x, y) => y.value - x.value || x.label.localeCompare(y.label));

  const b = g.breakdown;
  const tiles: { label: string; value: string | number; note?: string }[] = [
    {
      label: "Best day",
      value: bestDay >= 0 ? fmt(programDays[bestDay]) : 0,
      note: bestDay >= 0 ? day(PROGRAM_START_INDEX + bestDay) : undefined,
    },
    { label: "Havens with signups", value: `${events.filter((e) => e.total > 0).length}/${events.length}` },
    ...(b && b.signups > 0
      ? [
          { label: "Via referral", value: `${Math.round((b.referred / b.signups) * 100)}%` },
          { label: "Median age", value: medianAge(b.ages) },
        ]
      : []),
  ];

  return (
    <>
      <header className="hero ev-hero">
        <HeroNav now={now} tz={tz} back />
        <div className="hero-inner">
          <h1 className="ev-title glow">{scope === "us" ? "US signups" : "All signups"}</h1>
          <p className="ev-sub glow">
            {events.length} havens {scope === "us" ? "in the US" : `in ${byCountry.size} countries`}
          </p>
          <div className="scope-toggle" role="group" aria-label="Which havens to count">
            {SCOPES.map((o) => (
              <button key={o.scope} type="button" aria-pressed={scope === o.scope} onClick={() => setScope(o.scope)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="page">
        <section className="panel ev-top">
          <div className="ev-streak">
            <Image className="ev-daven" src="/haven/excited-daven.webp" alt="" width={791} height={695} />
            <div>
              <p className="ev-num">{fmt(g.total)}</p>
              <p className="ev-unit">signups</p>
              <p className="muted">{fmt(today)} today</p>
            </div>
          </div>
          <ul className="tiles gl-tiles">
            {tiles.map((t) => (
              <li key={t.label}>
                <span className="tile-v">{t.value}</span>
                <span className="tile-l">
                  {t.label}
                  {t.note && <span className="muted"> · {t.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Every day</h2>
          </div>
          <Columns
            values={programDays}
            labels={programDays.map((_, k) => day(PROGRAM_START_INDEX + k))}
            showLabel={(k) => k % (programDays.length > 28 ? 14 : 7) === 0}
            ariaLabel="Signups per program day"
          />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Running total</h2>
          </div>
          <Cumulative days={g.days} before={g.before} todayIndex={todayIndex} />
        </section>

        {b && b.signups > 0 && <Breakdowns b={b} signups={b.signups} />}

        {scope === "world" && (
          <section className="panel">
            <div className="panel-head">
              <h2>Top countries</h2>
            </div>
            {countries.length > 0 ? (
              <HBars rows={countries.slice(0, TOP_COUNTRIES)} total={g.total} />
            ) : (
              <p className="empty">Nothing yet.</p>
            )}
          </section>
        )}
      </main>
    </>
  );
}
