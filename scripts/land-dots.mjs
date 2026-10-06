// Generates public/land-dots.json: evenly spaced points (Fibonacci sphere) that fall on land.
// Run once: node scripts/land-dots.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve("world-atlas/land-110m.json"), "utf8"));
const land = feature(topo, topo.objects.land);

const N = 26000;
const golden = Math.PI * (3 - Math.sqrt(5));
const dots = [];
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2;
  const theta = golden * i;
  const lat = (Math.asin(y) * 180) / Math.PI;
  const lon = ((((theta * 180) / Math.PI) % 360) + 540) % 360 - 180;
  if (lat < -60) continue; // skip Antarctica, it only adds noise
  if (geoContains(land, [lon, lat])) dots.push(Math.round(lon * 10) / 10, Math.round(lat * 10) / 10);
}
writeFileSync(new URL("../public/land-dots.json", import.meta.url), JSON.stringify(dots));
console.log(`${dots.length / 2} land dots`);
