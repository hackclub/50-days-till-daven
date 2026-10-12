import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { loadSnapshot } from "./airtable";
import { aggregate } from "./aggregate";
import { CHART_DAYS, PULL_EVERY_MS } from "./config";
import { inScope, type Scope } from "./scope";
import { readHavenData } from "./storage";
import type { EventDetail, EventSummary, GlobalStats, HavenData } from "./types";

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

/** Every event in `scope` added together for /global. A day is still each event's own local day. */
export function globalStats(data: HavenData, scope: Scope): GlobalStats {
  const days = new Array(CHART_DAYS).fill(0);
  let before = 0;
  let total = 0;
  for (const e of data.events) {
    if (!inScope(e.country, scope)) continue;
    e.days.forEach((n, i) => (days[i] += n));
    before += e.before;
    total += e.total;
  }
  return { days, before, total, breakdown: data.combined?.[scope] ?? null };
}

export function findEvent(data: HavenData, param: string) {
  let slug = param;
  try {
    slug = decodeURIComponent(param);
  } catch {}
  const wanted = slug.normalize("NFC").toLowerCase();
  return data.events.find((e) => e.slug.normalize("NFC").toLowerCase() === wanted) ?? null;
}
