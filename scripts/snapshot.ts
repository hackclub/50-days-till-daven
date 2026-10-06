// Pulls Airtable once into data/snapshot.json so `pnpm dev` works offline / without a token.
// Usage: AIRTABLE_TOKEN=pat... pnpm snapshot
import { mkdirSync, writeFileSync } from "node:fs";
import { loadFromAirtable } from "../lib/airtable";

const token = process.env.AIRTABLE_TOKEN;
if (!token) {
  console.error("Set AIRTABLE_TOKEN first.");
  process.exit(1);
}

loadFromAirtable(token).then((data) => {
  mkdirSync("data", { recursive: true });
  writeFileSync("data/snapshot.json", JSON.stringify({ ...data, origin: "snapshot" }));
  console.log(`${data.events.length} events, ${data.signups.length} signups → data/snapshot.json`);
});
