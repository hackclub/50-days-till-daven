import "server-only";
import tzlookup from "@photostructure/tz-lookup";
import { CHART_DAYS, GLOBAL_TZ, MIN_BREAKDOWN } from "./config";
import { chartIndex, localParts } from "./dates";
import { inScope } from "./scope";
import type { Source } from "./sources";
import { AGE_BUCKETS, type Breakdown, type CombinedBreakdown, type EventDetail, type GlobalStats, type HavenData, type RawData } from "./types";

// Turns a raw pull into exactly what the pages show: per-event daily counts in local time, plus
// breakdowns (left out below MIN_BREAKDOWN signups), and all of them combined in Eastern Time for
// /global, worldwide and US only. Shared by /api/pull and scripts/pull.ts.

/** One event's signups counted on Eastern Time days, hours and weekdays, for /global. */
type EtCounts = { days: number[]; before: number; hours: number[]; weekdays: number[] };
type Working = EventDetail & { breakdown: Breakdown; et: EtCounts };

function timezoneFor(lat: number | null, lon: number | null) {
  if (lat === null || lon === null) return "UTC";
  try {
    return tzlookup(lat, lon);
  } catch {
    return "UTC";
  }
}

const ageBucket = (age: number) => (age <= 12 ? 0 : age >= 19 ? AGE_BUCKETS.length - 1 : age - 12);

const emptyBreakdown = (): Breakdown => ({
  hours: new Array(24).fill(0),
  weekdays: new Array(7).fill(0),
  ages: new Array(AGE_BUCKETS.length).fill(0),
  sources: {},
  unanswered: 0,
  referred: 0,
});

function addBreakdown(to: Breakdown, from: Breakdown) {
  from.hours.forEach((n, i) => (to.hours[i] += n));
  from.weekdays.forEach((n, i) => (to.weekdays[i] += n));
  from.ages.forEach((n, i) => (to.ages[i] += n));
  for (const [source, n] of Object.entries(from.sources) as [Source, number][]) {
    to.sources[source] = (to.sources[source] ?? 0) + n;
  }
  to.unanswered += from.unanswered;
  to.referred += from.referred;
}

/**
 * Every event's Eastern Time counts added together. Events below MIN_BREAKDOWN only go into the
 * breakdown together, and only once they add up to MIN_BREAKDOWN signups: otherwise subtracting the
 * published per-event breakdowns from it would give back a small event's own.
 */
function combine(events: Working[]): GlobalStats & { breakdown: CombinedBreakdown } {
  const small = events.filter((e) => e.total < MIN_BREAKDOWN);
  const pooled = small.reduce((n, e) => n + e.total, 0) >= MIN_BREAKDOWN;
  const g = { days: new Array(CHART_DAYS).fill(0), before: 0, total: 0, breakdown: { ...emptyBreakdown(), signups: 0 } };
  for (const e of events) {
    e.et.days.forEach((n, i) => (g.days[i] += n));
    g.before += e.et.before;
    g.total += e.total;
    if (e.total < MIN_BREAKDOWN && !pooled) continue;
    addBreakdown(g.breakdown, { ...e.breakdown, hours: e.et.hours, weekdays: e.et.weekdays });
    g.breakdown.signups += e.total;
  }
  return g;
}

export function aggregate(raw: RawData): HavenData {
  const byId = new Map<string, Working>();
  for (const e of raw.events) {
    if (e.status !== "Active") continue; // also filters old snapshots
    byId.set(e.id, {
      slug: e.slug,
      name: e.name,
      city: e.city,
      country: e.country,
      cap: e.cap,
      lat: e.lat,
      lon: e.lon,
      tz: timezoneFor(e.lat, e.lon),
      days: new Array(CHART_DAYS).fill(0),
      total: 0,
      before: 0,
      breakdown: emptyBreakdown(),
      et: { days: new Array(CHART_DAYS).fill(0), before: 0, hours: new Array(24).fill(0), weekdays: new Array(7).fill(0) },
    });
  }

  for (const s of raw.signups) {
    const e = byId.get(s.eventId);
    if (!e) continue;
    const local = localParts(s.time, e.tz);
    const i = chartIndex(local.date);
    e.total++;
    if (i < 0) e.before++;
    else if (i < CHART_DAYS) e.days[i]++;
    const b = e.breakdown;
    b.hours[local.hour]++;
    b.weekdays[local.weekday]++;
    if (s.age !== null) b.ages[ageBucket(s.age)]++;
    if (s.source) b.sources[s.source] = (b.sources[s.source] ?? 0) + 1;
    else b.unanswered++;
    if (s.referred) b.referred++;

    const et = localParts(s.time, GLOBAL_TZ);
    const j = chartIndex(et.date);
    if (j < 0) e.et.before++;
    else if (j < CHART_DAYS) e.et.days[j]++;
    e.et.hours[et.hour]++;
    e.et.weekdays[et.weekday]++;
  }

  // Worldwide is the US and everywhere else added together, each pooled on its own, so subtracting
  // the US-only breakdown from it can't single out a small event outside the US either.
  const events = [...byId.values()];
  const us = combine(events.filter((e) => inScope(e.country, "us")));
  const rest = combine(events.filter((e) => !inScope(e.country, "us")));
  const world = {
    days: us.days.map((n, i) => n + rest.days[i]),
    before: us.before + rest.before,
    total: us.total + rest.total,
    breakdown: { ...emptyBreakdown(), signups: us.breakdown.signups + rest.breakdown.signups },
  };
  addBreakdown(world.breakdown, us.breakdown);
  addBreakdown(world.breakdown, rest.breakdown);

  return {
    generatedAt: raw.fetchedAt,
    origin: raw.origin,
    events: events
      // an event's own ET counts only go into /global's totals and aren't published
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ et, ...e }): EventDetail => ({ ...e, breakdown: e.total >= MIN_BREAKDOWN ? e.breakdown : null }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    global: { world, us },
  };
}
