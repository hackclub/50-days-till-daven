import { CHART_START, PROGRAM_DAYS, PROGRAM_START } from "./config";

const DAY = 86_400_000;
const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string) {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    });
    formatters.set(tz, f);
  }
  return f;
}

export type LocalParts = { date: string; hour: number; minute: number; second: number; weekday: number };

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Wall-clock parts of an instant in a timezone. weekday: 0 = Monday. */
export function localParts(ms: number, tz: string): LocalParts {
  const p: Record<string, string> = {};
  for (const { type, value } of partsFormatter(tz).formatToParts(ms)) p[type] = value;
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    second: Number(p.second),
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
}

const utcDay = (key: string) => Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10));

/** Whole days between two YYYY-MM-DD keys. */
export const daysBetween = (from: string, to: string) => Math.round((utcDay(to) - utcDay(from)) / DAY);

export function addDays(key: string, n: number) {
  return new Date(utcDay(key) + n * DAY).toISOString().slice(0, 10);
}

/** Index into the chart's day array (0 = CHART_START). */
export const chartIndex = (key: string) => daysBetween(CHART_START, key);
export const chartDate = (i: number) => addDays(CHART_START, i);

export const PROGRAM_START_INDEX = chartIndex(PROGRAM_START);
export const PROGRAM_END_INDEX = PROGRAM_START_INDEX + PROGRAM_DAYS - 1;

const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
export const formatDay = (key: string) => monthDay.format(utcDay(key));

export function formatDuration(ms: number) {
  const mins = Math.max(0, Math.floor(ms / 60_000));
  if (mins === 0) return "<1m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export function formatClock(ms: number, tz: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(ms).toLowerCase();
}
