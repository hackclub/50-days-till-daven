import type { Source } from "./sources";

export type RawEvent = {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  status: string; // server-side only, never sent to the browser
  cap: number | null;
  lat: number | null;
  lon: number | null;
};

export type RawSignup = {
  eventId: string;
  time: number;
  age: number | null;
  source: Source | null;
  referred: boolean;
};

export type RawData = {
  fetchedAt: number;
  origin: "airtable" | "snapshot" | "empty";
  events: RawEvent[];
  signups: RawSignup[];
};

/** What the homepage and globe need: one row per event, daily counts by local date. */
export type EventSummary = {
  slug: string;
  name: string;
  city: string;
  country: string;
  cap: number | null;
  lat: number | null;
  lon: number | null;
  tz: string;
  days: number[]; // CHART_DAYS long, index 0 = CHART_START, in the event's local timezone
  total: number; // every counted signup, including ones before the chart window
};

export type Breakdown = {
  hours: number[]; // 24, local hour of day
  weekdays: number[]; // 7, Monday first
  ages: number[]; // AGE_BUCKETS
  sources: Partial<Record<Source, number>>;
  unanswered: number;
  referred: number;
};

export type EventDetail = EventSummary & {
  before: number; // signups before CHART_START
  breakdown: Breakdown | null; // null below MIN_BREAKDOWN signups, so nobody can be singled out
};

export type HavenData = {
  generatedAt: number;
  origin: RawData["origin"];
  events: EventDetail[];
  combined?: CombinedBreakdown; // missing from pulls saved before /global existed
};

/** Every event's breakdown added together (see aggregate.ts), and how many signups it covers. */
export type CombinedBreakdown = Breakdown & { signups: number };

/** What /global shows: every event added together, each day still in each event's own timezone. */
export type GlobalStats = {
  days: number[];
  before: number;
  total: number;
  breakdown: CombinedBreakdown | null;
};

export const AGE_BUCKETS = ["≤12", "13", "14", "15", "16", "17", "18", "19+"];
