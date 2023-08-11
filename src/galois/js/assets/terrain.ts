import { blockIDs } from "@/galois/assets/blocks";
import { floraIDs } from "@/galois/assets/florae";
import { glassIDs } from "@/galois/assets/glass";
import * as l from "@/galois/lang";
import assert from "assert";

type IDMap =
  | Record<string, l.BlockID>
  | Record<string, l.FloraID>
  | Record<string, l.GlassID>;

function mapIDs<T extends IDMap>(ids: T): { [ID in keyof T]: l.TerrainID } {
  return Object.fromEntries(
    Object.entries(ids).map(([k, v]) => [k, l.ToTerrainID(v)])
  ) as { [ID in keyof T]: l.TerrainID };
}

// Assert that all string names are unique.
const allNames = [
  ...Object.keys(blockIDs),
  ...Object.keys(floraIDs),
  ...Object.keys(glassIDs),
];
assert.ok(
  allNames.length === new Set(allNames).size,
  "Name conflict across blocks, flora, and glass."
);

// TODO: Add CI that ensures that this list is always backwards compatible.
export const terrainIDs = {
  ...mapIDs(blockIDs),
  ...mapIDs(floraIDs),
  ...mapIDs(glassIDs),
};

export function getAssets(): Record<string, l.Asset> {
  return {
    "definitions/terrain": l.ToTerrainTable(
      Array.from(Object.entries(terrainIDs))
    ),
  };
}
