"use client";

import Image from "next/image";
import { MIN_BREAKDOWN, REWARD, STREAK_GOAL } from "@/lib/config";
import { chartDate, formatClock, formatDay, PROGRAM_START_INDEX } from "@/lib/dates";
import { SOURCES } from "@/lib/sources";
import { computeStreak, streakRank, type Streak } from "@/lib/streak";
import { AGE_BUCKETS, type EventDetail, type EventSummary } from "@/lib/types";
import { Columns } from "./charts/Columns";
import { ContributionGrid } from "./charts/ContributionGrid";
import { Cumulative } from "./charts/Cumulative";
import { HBars } from "./charts/HBars";
import { HeroNav } from "./HeroNav";
import { useNow } from "./useNow";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, h) => (h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`));
const day = (i: number) => formatDay(chartDate(i));

function goalLine(s: Streak) {
  if (s.qualified) return `${REWARD} earned`;
  if (!s.reachable) return "Out of reach before Haven";
  const left = STREAK_GOAL - s.current;
  const finish = s.todayIndex + left - (s.countsToday ? 0 : 1);
  return `${left} more ${left === 1 ? "day" : "days"}, ${day(finish)} at the earliest`;
}

function medianBucket(ages: number[]) {
  const total = ages.reduce((a, b) => a + b, 0);
  for (let k = 0, run = 0; k < ages.length && total; k++) {
    run += ages[k];
    if (run >= total / 2) return AGE_BUCKETS[k];
  }
  return "–";
}

export function EventView({ event: e, all, generatedAt }: { event: EventDetail; all: EventSummary[]; generatedAt: number }) {
  const { now, tz } = useNow(generatedAt, 15_000);
  const s = computeStreak(e.days, e.tz, now);

  const rank = s.current > 0 ? streakRank(s.current, all.map((o) => computeStreak(o.days, o.tz, now).current)) : null;
  let bestDay = -1;
  e.days.forEach((n, i) => {
    if (i <= s.todayIndex && n > 0 && (bestDay < 0 || n > e.days[bestDay])) bestDay = i;
  });
  const b = e.breakdown;
  const answered = b ? e.total - b.unanswered : 0;
  const sources = b
    ? SOURCES.map((label) => ({ label, value: b.sources[label] ?? 0 }))
        .filter((r) => r.value > 0)
        .sort((x, y) => y.value - x.value)
    : [];
  const meter = s.qualified ? STREAK_GOAL : Math.min(s.current, STREAK_GOAL);
  // program days that ended without a signup (today still has until midnight)
  const missed: number[] = [];
  for (let i = PROGRAM_START_INDEX; i < s.todayIndex; i++) if (!e.days[i]) missed.push(i);

  const tiles: { label: string; value: string | number; note?: string }[] = [
    { label: "Signups", value: e.total, note: e.cap ? `of ${e.cap}` : undefined },
    { label: "Today", value: s.today },
    { label: "Best day", value: bestDay >= 0 ? e.days[bestDay] : 0, note: bestDay >= 0 ? day(bestDay) : undefined },
    { label: "Days with a signup", value: `${s.activeDays}/${s.dayOfProgram}` },
    ...(b
      ? [
          { label: "Via referral", value: `${Math.round((b.referred / e.total) * 100)}%` },
          { label: "Median age", value: medianBucket(b.ages) },
        ]
      : []),
  ];

  return (
    <>
      <header className="hero ev-hero">
        <HeroNav now={now} tz={tz} back />
        <div className="hero-inner">
          <h1 className="ev-title glow">Haven {e.name}</h1>
          <p className="ev-sub glow">
            {e.city}, {e.country} · {formatClock(now, e.tz)} there
          </p>
        </div>
      </header>

      <main className="page">
        <section className="panel ev-top">
          <div className="ev-streak">
            {s.current > 0 ? (
              <Image className="ev-daven" src="/haven/excited-daven.webp" alt="" width={791} height={695} />
            ) : (
              <Image className="ev-daven evil-face" src="/haven/evil-daven-face.jpg" alt="Evil Daven" width={320} height={320} />
            )}
            <div>
              <p className="ev-num">{s.current}</p>
              <p className="ev-unit">day streak</p>
              <p className="muted">
                best {s.longest}
                {rank ? ` · #${rank} of ${all.length}` : ""}
              </p>
            </div>
          </div>
          <div className="ev-goal">
            <p className="ev-goal-head">
              <span>
                {STREAK_GOAL} days → {REWARD}
              </span>
              <span className="num">
                {meter}/{STREAK_GOAL}
              </span>
            </p>
            <div className={`goal-meter${s.reachable ? "" : " out"}`} aria-hidden="true">
              {Array.from({ length: STREAK_GOAL }, (_, i) => (
                <span key={i} className={i < meter ? "on" : undefined} />
              ))}
            </div>
            <p className="muted">{goalLine(s)}</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Every day</h2>
          </div>
          <div className="ev-daily">
            <ContributionGrid days={e.days} todayIndex={s.todayIndex} />
            <ul className="tiles">
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
          </div>
          <details className="table-view">
            <summary>as a table</summary>
            <table className="num">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Signups</th>
                </tr>
              </thead>
              <tbody>
                {e.days.slice(0, s.todayIndex + 1).map((n, i) => (
                  <tr key={i}>
                    <td>{day(i)}</td>
                    <td>{i >= PROGRAM_START_INDEX ? i - PROGRAM_START_INDEX + 1 : "–"}</td>
                    <td>{n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </section>

        <section className="panel evil">
          <Image
            className="evil-art"
            src="/haven/evil-daven.jpg"
            alt="Evil Daven, grinning in front of flames"
            width={1600}
            height={937}
            sizes="(min-width: 1184px) 1120px, 100vw"
          />
          <div className="panel-head">
            <h2>
              Missed days<span className="count">{missed.length}</span>
            </h2>
          </div>
          {missed.length > 0 ? (
            <ul className="chips">
              {missed.map((i) => (
                <li key={i}>
                  <span>{day(i)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>None yet.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Running total</h2>
          </div>
          <Cumulative days={e.days} before={e.before} todayIndex={s.todayIndex} />
        </section>

        {b ? (
          <div className="ev-pair">
            <section className="panel">
              <div className="panel-head">
                <h2>By weekday</h2>
              </div>
              <Columns values={b.weekdays} labels={WEEKDAYS} ariaLabel="Signups by weekday" />
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>By hour</h2>
              </div>
              <Columns values={b.hours} labels={HOURS} showLabel={(h) => h % 6 === 0} ariaLabel="Signups by local hour of day" />
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>Ages</h2>
              </div>
              <Columns values={b.ages} labels={AGE_BUCKETS} unit={["person", "people"]} ariaLabel="Signups by age" />
            </section>
            <section className="panel">
              <div className="panel-head">
                <h2>How they heard</h2>
              </div>
              {sources.length > 0 ? <HBars rows={sources} total={answered} /> : <p className="empty">Nothing yet.</p>}
            </section>
          </div>
        ) : (
          <p className="panel note">More stats after {MIN_BREAKDOWN} signups.</p>
        )}
      </main>
    </>
  );
}
