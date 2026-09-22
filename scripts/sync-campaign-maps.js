import { readFile, writeFile } from "node:fs/promises";
import { CAMPAIGN_PLAN, expandCampaignTerrain } from "../src/data/levels/campaignExpansion.js";

for (const id of Object.keys(CAMPAIGN_PLAN)) {
  const path = new URL(`../assets/levels/${id}/tilemap.json`, import.meta.url);
  const map = JSON.parse(await readFile(path, "utf8"));
  const expanded = expandCampaignTerrain(id, map);
  // Preserve the compact, one-object-per-line layout of the existing Tiled files.
  let json = JSON.stringify(expanded, null, 2);
  for (const object of expanded.layers.find(({ name }) => name === "terrain").objects) {
    const pretty = JSON.stringify(object, null, 2).split("\n").map((line, i) => i ? `        ${line}` : line).join("\n");
    json = json.replace(pretty, JSON.stringify(object));
  }
  await writeFile(path, `${json}\n`);
  console.log(`${id}: ${expanded.width * expanded.tilewidth}px`);
}
