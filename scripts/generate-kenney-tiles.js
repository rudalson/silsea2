import { buildKenneyTileset, KENNEY_TILESETS } from "./kenney-tiles.js";

for (const key of Object.keys(KENNEY_TILESETS)) await buildKenneyTileset(key);
