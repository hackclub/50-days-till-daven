import "server-only";
import tzlookup from "@photostructure/tz-lookup";
import { cacheLife, cacheTag } from "next/cache";
import { loadSnapshot } from "./airtable";
import { CHART_DAYS, MIN_BREAKDOWN, PULL_EVERY_MS } from "./config";
import { chartIndex, localParts } from "./dates";
import { readHavenData } from "./storage";
import { AGE_BUCKETS, type Breakdown, type EventDetail, type EventSummary, type HavenData, type RawData } from "./types";

function timezoneFor(lat: number | null, lon: number | null) {
  if (lat === null || lon === null) return "UTC";
  try {
    return tzlookup(lat, lon);
  } catch {
    return "UTC";
  }
}

const ageBucket = (age: number) => (age <= 12 ? 0 : age >= 19 ? AGE_BUCKETS.length - 1 : age - 12);

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
      breakdown: {
        hours: new Array(24).fill(0),
        weekdays: new Array(7).fill(0),
        ages: new Array(AGE_BUCKETS.length).fill(0),
        sources: {},
        unanswered: 0,
        referred: 0,
      },
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

  return {
    generatedAt: raw.fetchedAt,
    origin: raw.origin,
    events: [...byId.values()]
      .map((e): EventDetail => ({ ...e, breakdown: e.total >= MIN_BREAKDOWN ? e.breakdown : null }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export const HAVEN_TAG = "haven";

/**
 * What every page renders from: the latest pull saved by /api/pull, cached across requests and
 * instances. /api/pull clears the cache after each pull, so reading it never touches Airtable.
 * Before the first pull (or locally with no data/haven.json) it falls back to data/snapshot.json.
 */
export async function getHavenData(): Promise<HavenData> {
  "use cache: remote";
  cacheLife({ stale: 300, revalidate: PULL_EVERY_MS / 1000, expire: 30 * 86_400 });
  cacheTag(HAVEN_TAG);
  return (await readHavenData()) ?? aggregate(await loadSnapshot());
}

export function toSummary(e: EventDetail): EventSummary {
  const { slug, name, city, country, cap, lat, lon, tz, days, total } = e;
  return { slug, name, city, country, cap, lat, lon, tz, days, total };
}

export function findEvent(data: HavenData, param: string) {
  let slug = param;
  try {
    slug = decodeURIComponent(param);
  } catch {}
  const wanted = slug.normalize("NFC").toLowerCase();
  return data.events.find((e) => e.slug.normalize("NFC").toLowerCase() === wanted) ?? null;
}
