// Runs before `next build` (package.json). On a fresh deploy there's no saved pull yet, so this does
// the first one and the site has data immediately; after that the saved copy is usually less than
// an hour old and this does nothing (the cron keeps it fresh). A failed pull never blocks a deploy.
import { describeError, loadFromAirtable } from "../lib/airtable";
import { aggregate } from "../lib/aggregate";
import { PULL_EVERY_MS } from "../lib/config";
import { readHavenData, saveHavenData } from "../lib/storage";

async function main() {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return console.log("[haven] no AIRTABLE_TOKEN, skipping the pull");

  const saved = await readHavenData();
  // a pull saved before /global existed has no combined breakdown, so it's replaced whatever its age
  if (saved?.combined && Date.now() - saved.generatedAt < PULL_EVERY_MS) {
    return console.log(`[haven] saved pull is ${Math.round((Date.now() - saved.generatedAt) / 60_000)}m old, skipping`);
  }
  const t0 = Date.now();
  const data = aggregate(await loadFromAirtable(token));
  await saveHavenData(data);
  console.log(`[haven] pulled ${data.events.length} events in ${Math.round((Date.now() - t0) / 1000)}s`);
}

main().catch((err) => console.warn(`[haven] pull failed, building with the previous data: ${describeError(err)}`));
