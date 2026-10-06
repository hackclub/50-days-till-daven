import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadFromAirtable, loadSnapshot } from "./airtable";
import { PULL_EVERY_MS } from "./config";
import type { RawData } from "./types";

// One Airtable pull every 12 hours, in the background. The latest pull lives in memory and is also saved
// to disk, so a restart serves it straight away instead of pulling again. Pages only ever read memory;
// the one exception is the very first request on a fresh server, which waits for the first pull.
//
// The saved file holds per-signup times, ages and event ids — never names, emails or the token — and is
// readable by the app's user only.
const FILE = process.env.HAVEN_CACHE_FILE ?? path.join(process.cwd(), ".next", "cache", "haven-airtable.json");
const RETRY_AFTER_FAILURE_MS = 5 * 60_000;

type State = { data: RawData | null; pulling: Promise<RawData> | null; scheduled: boolean; failedAt: number };
const g = globalThis as typeof globalThis & { __haven?: State };
const state = (g.__haven ??= { data: null, pulling: null, scheduled: false, failedAt: 0 });

async function readSaved(): Promise<RawData | null> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as RawData;
  } catch {
    return null;
  }
}

async function save(data: RawData) {
  await mkdir(path.dirname(FILE), { recursive: true, mode: 0o700 });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data), { mode: 0o600 });
  await rename(tmp, FILE);
}

function pull(token: string): Promise<RawData> {
  state.pulling ??= (async () => {
    const t0 = Date.now();
    console.log("[haven] pulling from Airtable");
    try {
      const data = await loadFromAirtable(token);
      state.data = data;
      await save(data).catch((err: Error) => console.error(`[haven] couldn't save the pull: ${err.message}`));
      console.log(`[haven] pulled ${data.events.length} events, ${data.signups.length} signups in ${Math.round((Date.now() - t0) / 1000)}s`);
      return data;
    } catch (err) {
      state.failedAt = Date.now();
      console.error(`[haven] Airtable pull failed: ${(err as Error).message}`);
      throw err;
    } finally {
      state.pulling = null;
    }
  })();
  return state.pulling;
}

/** Sets up the 12-hour timer once per server, timed from when the current data was pulled. */
function schedule(token: string) {
  if (state.scheduled) return;
  state.scheduled = true;
  const age = state.data ? Date.now() - state.data.fetchedAt : PULL_EVERY_MS;
  setTimeout(
    () => {
      void pull(token).catch(() => {});
      setInterval(() => void pull(token).catch(() => {}), PULL_EVERY_MS).unref();
    },
    Math.max(0, PULL_EVERY_MS - age),
  ).unref();
}

/** The latest signup data. Without AIRTABLE_TOKEN it reads data/snapshot.json instead. */
export async function getRaw(): Promise<RawData> {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return loadSnapshot();

  if (!state.data) state.data = await readSaved();
  if (state.data) {
    schedule(token);
    return state.data;
  }

  // nothing pulled yet on this server: wait for the first pull (but don't retry a failure on every request)
  if (!state.pulling && Date.now() - state.failedAt < RETRY_AFTER_FAILURE_MS) {
    throw new Error("The Airtable pull failed; retrying in a few minutes. Check the server logs.");
  }
  const data = await pull(token);
  schedule(token);
  return data;
}
