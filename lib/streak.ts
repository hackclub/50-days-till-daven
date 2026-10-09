import { STREAK_GOAL } from "./config";
import { chartIndex, localParts, PROGRAM_END_INDEX, PROGRAM_START_INDEX } from "./dates";

export type Streak = {
  current: number; // consecutive days ending today, or yesterday if today has no signup yet
  longest: number;
  today: number; // signups today (local)
  countsToday: boolean; // today already has a signup
  todayIndex: number; // chart index of the event's local today, clamped to the program
  dayOfProgram: number; // 1..50
  activeDays: number; // program days with ≥1 signup so far
  qualified: boolean; // hit the 30-day goal at some point
  reachable: boolean; // 30-day goal still possible (or already hit)
};

/** Place among `currents`: equal streaks share a place and the next streak takes the next one (1, 1, 2), never skipping. */
export function streakRank(current: number, currents: number[]): number {
  return 1 + new Set(currents.filter((c) => c > current)).size;
}

export function computeStreak(days: number[], tz: string, now: number): Streak {
  const rawToday = chartIndex(localParts(now, tz).date);
  const programOver = rawToday > PROGRAM_END_INDEX;
  const t = Math.min(Math.max(rawToday, PROGRAM_START_INDEX - 1), PROGRAM_END_INDEX);
  const has = (i: number) => (days[i] ?? 0) > 0;

  const countsToday = !programOver && t >= PROGRAM_START_INDEX && has(t);
  let i = programOver || countsToday ? t : t - 1;
  let current = 0;
  while (i >= PROGRAM_START_INDEX && has(i)) {
    current++;
    i--;
  }

  let longest = 0;
  let run = 0;
  let activeDays = 0;
  for (let k = PROGRAM_START_INDEX; k <= t; k++) {
    if (has(k)) {
      run++;
      activeDays++;
      longest = Math.max(longest, run);
    } else run = 0;
  }

  const daysAfterToday = PROGRAM_END_INDEX - t;
  const bestPossible = programOver ? current : (countsToday ? current : current + 1) + daysAfterToday;

  return {
    current,
    longest,
    today: rawToday === t ? (days[t] ?? 0) : 0,
    countsToday,
    todayIndex: t,
    dayOfProgram: Math.max(0, t - PROGRAM_START_INDEX + 1),
    activeDays,
    qualified: longest >= STREAK_GOAL,
    reachable: longest >= STREAK_GOAL || bestPossible >= STREAK_GOAL,
  };
}
