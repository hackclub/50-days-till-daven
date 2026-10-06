import "server-only";
import { get, put } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { HavenData } from "./types";

// Where the latest pull lives, already aggregated into exactly what the pages show (no raw signup rows).
// On Vercel: a private Vercel Blob, readable only with the store's token. Locally, when there's no
// BLOB_READ_WRITE_TOKEN: data/haven.json (gitignored).
const BLOB_PATH = "haven-data.json";
const LOCAL_FILE = path.join(process.cwd(), "data", "haven.json");
const onVercelBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export async function saveHavenData(data: HavenData) {
  const body = JSON.stringify(data);
  if (onVercelBlob()) {
    await put(BLOB_PATH, body, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return;
  }
  await mkdir(path.dirname(LOCAL_FILE), { recursive: true });
  await writeFile(LOCAL_FILE, body, { mode: 0o600 });
}

export async function readHavenData(): Promise<HavenData | null> {
  if (onVercelBlob()) {
    const res = await get(BLOB_PATH, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return (await new Response(res.stream).json()) as HavenData;
  }
  try {
    return JSON.parse(await readFile(LOCAL_FILE, "utf8")) as HavenData;
  } catch {
    return null;
  }
}
