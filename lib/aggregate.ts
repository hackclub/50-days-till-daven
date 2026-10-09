import "server-only";
import tzlookup from "@photostructure/tz-lookup";
import { CHART_DAYS, MIN_BREAKDOWN } from "./config";
import { chartIndex, localParts } from "./dates";
import type { Source } from "./sources";
import { AGE_BUCKETS, type Breakdown, type CombinedBreakdown, type EventDetail, type HavenData, type RawData } from "./types";

// Turns a raw pull into exactly what the pages show: per-event daily counts in local time, plus
// breakdowns (left out below MIN_BREAKDOWN signups) and all of them combined for /global.
// Shared by /api/pull and scripts/pull.ts.

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
 * Events below MIN_BREAKDOWN only go into the combined breakdown together, and only once they add up
 * to MIN_BREAKDOWN signups: otherwise subtracting the published per-event breakdowns from it would
 * give back a small event's own.
 */
function combineBreakdowns(events: (EventDetail & { breakdown: Breakdown })[]): CombinedBreakdown {
  const small = events.filter((e) => e.total < MIN_BREAKDOWN);
  const pooled = small.reduce((n, e) => n + e.total, 0) >= MIN_BREAKDOWN;
  const combined = { ...emptyBreakdown(), signups: 0 };
  for (const e of events) {
    if (e.total < MIN_BREAKDOWN && !pooled) continue;
    addBreakdown(combined, e.breakdown);
    combined.signups += e.total;
  }
  return combined;
}

export function aggregate(raw: RawData): HavenData {
  const byId = new Map<string, EventDetail & { breakdown: Breakdown }>();
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
  }

  const events = [...byId.values()];
  return {
    generatedAt: raw.fetchedAt,
    origin: raw.origin,
    events: events
      .map((e): EventDetail => ({ ...e, breakdown: e.total >= MIN_BREAKDOWN ? e.breakdown : null }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    combined: combineBreakdowns(events),
  };
}
