import { colorIDs } from "@/galois/assets/blocks";
import * as l from "@/galois/lang";
import { assert } from "chai";

type GlassName = keyof typeof glassDefs & keyof typeof glassIDs;

export const glassDefs = {
  simple_glass: l.ToGlass("glass/simple_glass.json"),
  DEPRECATED_muckwad: l.ToGlass("glass/muckwad.json"),
};

export const glassIDs = {
  simple_glass: l.ToGlassID(1),
  DEPRECATED_muckwad: l.ToGlassID(2),
};

assert.ok(
  Object.keys(glassIDs).every((key) => glassDefs[key as GlassName]),
  "glassIDs and glassDefs not in sync."
);
assert.ok(
  Object.keys(glassDefs).every((key) => glassIDs[key as GlassName]),
  "glassIDs and glassDefs not in sync."
);

// Assemble the ID to glass mappings.
const indexEntries: [l.GlassID, l.Glass][] = [];
for (const [name, id] of Object.entries(glassIDs)) {
  indexEntries.push([id, glassDefs[name as GlassName]]);
}

export const glassIndex = l.ToGlassIndex(
  indexEntries,
  glassIDs.simple_glass,
  Object.entries(colorIDs)
);
export const glassAtlas = l.ToAtlas(glassIndex);

const glassMeshes: Record<string, l.GlassItemMesh> = {};
for (const [name, id] of Object.entries(glassIDs)) {
  glassMeshes[`item_meshes/glass/${name}`] = l.ToItemMesh(id, glassIndex);
}

export function getAssets(): Record<string, l.Asset> {
  return {
    "atlases/glass": glassAtlas,
    "indices/glass": glassIndex,
    ...glassMeshes,
  };
}
