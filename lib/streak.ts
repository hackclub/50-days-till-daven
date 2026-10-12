import { DOUBLE_GOAL, DOUBLE_MIN, STREAK_GOAL } from "./config";
import { chartIndex, localParts, PROGRAM_END_INDEX, PROGRAM_START_INDEX } from "./dates";

/** Program days in a row with at least some number of signups, against a goal. */
export type Run = {
  current: number; // consecutive days ending today, or yesterday if today hasn't made it yet
  longest: number;
  countsToday: boolean; // today already made it
  activeDays: number; // program days that made it so far
  qualified: boolean; // hit the goal at some point
  reachable: boolean; // goal still possible (or already hit)
};

/** At least one signup a day toward STREAK_GOAL, plus the 2-a-day run toward DOUBLE_GOAL. */
export type Streak = Run & {
  today: number; // signups today (local)
  todayIndex: number; // chart index of the event's local today, clamped to the program
  dayOfProgram: number; // 1..50
  double: Run;
};

/** Place among `currents`: equal streaks share a place and the next streak takes the next one (1, 1, 2), never skipping. */
export function streakRank(current: number, currents: number[]): number {
  return 1 + new Set(currents.filter((c) => c > current)).size;
}

function run(days: number[], t: number, programOver: boolean, min: number, goal: number): Run {
  const has = (i: number) => (days[i] ?? 0) >= min;

  const countsToday = !programOver && t >= PROGRAM_START_INDEX && has(t);
  let i = programOver || countsToday ? t : t - 1;
  let current = 0;
  while (i >= PROGRAM_START_INDEX && has(i)) {
    current++;
    i--;
  }

  let longest = 0;
  let len = 0;
  let activeDays = 0;
  for (let k = PROGRAM_START_INDEX; k <= t; k++) {
    if (has(k)) {
      len++;
      activeDays++;
      longest = Math.max(longest, len);
    } else len = 0;
  }

  const daysAfterToday = PROGRAM_END_INDEX - t;
  const bestPossible = programOver ? current : (countsToday ? current : current + 1) + daysAfterToday;

  return {
    current,
    longest,
    countsToday,
    activeDays,
    qualified: longest >= goal,
    reachable: longest >= goal || bestPossible >= goal,
  };
}

export function computeStreak(days: number[], tz: string, now: number): Streak {
  const rawToday = chartIndex(localParts(now, tz).date);
  const programOver = rawToday > PROGRAM_END_INDEX;
  const t = Math.min(Math.max(rawToday, PROGRAM_START_INDEX - 1), PROGRAM_END_INDEX);

  return {
    ...run(days, t, programOver, 1, STREAK_GOAL),
    today: rawToday === t ? (days[t] ?? 0) : 0,
    todayIndex: t,
    dayOfProgram: Math.max(0, t - PROGRAM_START_INDEX + 1),
    double: run(days, t, programOver, DOUBLE_MIN, DOUBLE_GOAL),
  };
}
