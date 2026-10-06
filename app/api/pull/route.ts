import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { loadFromAirtable } from "@/lib/airtable";
import { aggregate, HAVEN_TAG } from "@/lib/data";
import { readHavenData, saveHavenData } from "@/lib/storage";

// The only code that talks to Airtable. Vercel Cron calls it every 12 hours (vercel.json), sending
// `Authorization: Bearer $CRON_SECRET`. A pull is ~25 requests, at most 1 per second (lib/airtable.ts).
export const maxDuration = 300;

// Even with the secret, a pull within 10 minutes of the last one is skipped.
const MIN_GAP_MS = 10 * 60_000;

const shared = globalThis as typeof globalThis & { __havenPulling?: Promise<Response> | null };

function authorized(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || !header) return false;
  const given = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function pull(token: string): Promise<Response> {
  const last = await readHavenData();
  if (last && Date.now() - last.generatedAt < MIN_GAP_MS) {
    return Response.json({ skipped: "pulled less than 10 minutes ago" });
  }
  try {
    const t0 = Date.now();
    const data = aggregate(await loadFromAirtable(token));
    await saveHavenData(data);
    revalidateTag(HAVEN_TAG, { expire: 0 }); // the next visit renders the new pull
    console.log(`[haven] pulled ${data.events.length} events in ${Math.round((Date.now() - t0) / 1000)}s`);
    return Response.json({ events: data.events.length, pulledAt: new Date(data.generatedAt).toISOString() });
  } catch (err) {
    console.error(`[haven] pull failed: ${(err as Error).message}`);
    return new Response("Pull failed; see the function logs.", { status: 502 });
  }
}

export async function GET() {
  if (!authorized((await headers()).get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return new Response("AIRTABLE_TOKEN is not set", { status: 500 });

  // one pull at a time per instance
  shared.__havenPulling ??= pull(token).finally(() => {
    shared.__havenPulling = null;
  });
  return (await shared.__havenPulling).clone();
}
