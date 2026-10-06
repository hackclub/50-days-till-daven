import "server-only";
import { readFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import path from "node:path";
import {
  AIRTABLE_API_URL,
  AIRTABLE_BASE_ID,
  AIRTABLE_TABLES,
  ATTENDEE_FIELDS,
  ATTENDEE_FILTER,
  EVENT_FIELDS,
  EVENT_FILTER,
} from "./airtable-config";
import { categorizeSource } from "./sources";
import type { RawData, RawEvent, RawSignup } from "./types";

type Fields = Record<string, unknown>;
type AirtableRecord = { id: string; fields: Fields };

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v.replace(/[[\]]/g, "")) : NaN;
  return Number.isFinite(n) ? n : null;
}

const str = (v: unknown) => (typeof first(v) === "string" ? (first(v) as string).trim() : "");

export function normalizeEvent(id: string, f: Fields): RawEvent | null {
  const slug = str(f[EVENT_FIELDS.slug]);
  if (!slug) return null;
  const name = str(f[EVENT_FIELDS.name]) || slug;
  const location = str(f[EVENT_FIELDS.location]);
  const cut = location.lastIndexOf(", ");
  return {
    id,
    slug,
    name,
    city: cut > 0 ? location.slice(0, cut) : name,
    country: cut > 0 ? location.slice(cut + 2) : location,
    status: str(f[EVENT_FIELDS.status]),
    cap: num(first(f[EVENT_FIELDS.signupCap])),
    lat: num(f[EVENT_FIELDS.lat]),
    lon: num(f[EVENT_FIELDS.lon]),
  };
}

export function normalizeSignup(f: Fields): RawSignup | null {
  const eventId = str(f[ATTENDEE_FIELDS.event]);
  const time = Date.parse(str(f[ATTENDEE_FIELDS.signupTime]));
  if (!eventId || !Number.isFinite(time)) return null;
  const age = num(first(f[ATTENDEE_FIELDS.age]));
  const referredBy = f[ATTENDEE_FIELDS.referredBy];
  return {
    eventId,
    time,
    age: age !== null && age >= 5 && age < 100 ? Math.floor(age) : null,
    source: categorizeSource(f[ATTENDEE_FIELDS.heardFrom]),
    referred: (Array.isArray(referredBy) && referredBy.length > 0) || num(f[ATTENDEE_FIELDS.referralCode]) !== null,
  };
}

// Airtable allows 5 req/s per base; we stay at or under 1 req/s. Requests are sequential and each one
// starts at least REQUEST_GAP_MS after the previous one, retries included.
const REQUEST_GAP_MS = 1050;
let lastRequestAt = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Plain node:http(s) rather than fetch: Next patches fetch, and the patched one can stall when called
// from a background job. The timeout means a dead connection can't hold the pull lock forever.
function getJson(url: URL, token: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const send = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = send(url, { headers: { Authorization: `Bearer ${token}` }, timeout: 30_000 }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error("Airtable request timed out")));
    req.on("error", reject);
    req.end();
  });
}

async function airtableGet(url: URL, token: string, attempt = 0): Promise<{ records: AirtableRecord[]; offset?: string }> {
  const wait = lastRequestAt + REQUEST_GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  const { status, body } = await getJson(url, token);
  if ((status === 429 || status >= 500) && attempt < 3) {
    // Airtable asks for 30s of quiet after a 429
    await sleep(status === 429 ? 30_000 : 2000 * 2 ** attempt);
    return airtableGet(url, token, attempt + 1);
  }
  if (status < 200 || status >= 300) throw new Error(`Airtable ${status}: ${body.slice(0, 300)}`);
  return JSON.parse(body);
}

async function listAll(table: string, fields: string[], filter: string, token: string) {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${table}`);
    for (const f of fields) url.searchParams.append("fields[]", f);
    url.searchParams.set("filterByFormula", filter);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const page = await airtableGet(url, token);
    records.push(...page.records);
    offset = page.offset;
  } while (offset);
  return records;
}

/** One full pull: one request per 100 records (~25 today), at most 1 per second. Called by app/api/pull. */
export async function loadFromAirtable(token: string): Promise<RawData> {
  if (!AIRTABLE_BASE_ID) throw new Error("AIRTABLE_BASE_ID is not set");
  const events = await listAll(AIRTABLE_TABLES.events, Object.values(EVENT_FIELDS), EVENT_FILTER, token);
  const attendees = await listAll(AIRTABLE_TABLES.attendees, Object.values(ATTENDEE_FIELDS), ATTENDEE_FILTER, token);
  return {
    fetchedAt: Date.now(),
    origin: "airtable",
    events: events.map((r) => normalizeEvent(r.id, r.fields)).filter((e): e is RawEvent => e !== null),
    signups: attendees.map((r) => normalizeSignup(r.fields)).filter((s): s is RawSignup => s !== null),
  };
}

/** Local development without a token: data/snapshot.json (see scripts/snapshot.ts). */
export async function loadSnapshot(): Promise<RawData> {
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "snapshot.json"), "utf8");
    return { ...(JSON.parse(raw) as RawData), origin: "snapshot" };
  } catch {
    return { fetchedAt: 0, origin: "empty", events: [], signups: [] };
  }
}
