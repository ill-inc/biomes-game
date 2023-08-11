import * as audio from "@/galois/assets/audio";
import * as blocks from "@/galois/assets/blocks";
import * as color_palettes from "@/galois/assets/color_palettes";
import * as florae from "@/galois/assets/florae";
import * as gaia from "@/galois/assets/gaia";
import * as glass from "@/galois/assets/glass";
import * as groups from "@/galois/assets/groups";
import * as icons from "@/galois/assets/icons";
import * as items from "@/galois/assets/items";
import * as mapping from "@/galois/assets/mapping";
import * as npcs from "@/galois/assets/npcs";
import * as placeable_groups from "@/galois/assets/placeable_groups";
import * as placeables from "@/galois/assets/placeables";
import * as scenes from "@/galois/assets/scenes";
import * as shapers from "@/galois/assets/shapers";
import * as shapes from "@/galois/assets/shapes";
import * as terrain from "@/galois/assets/terrain";
import * as textures from "@/galois/assets/textures";
import * as water from "@/galois/assets/water";
import * as wearables from "@/galois/assets/wearables";
import type * as l from "@/galois/lang";
import { assert } from "chai";

const assets = new Map<string, l.GeneralNode<string>>();

// Assemble all assets together.
[
  placeable_groups,
  audio,
  blocks,
  color_palettes,
  florae,
  gaia,
  groups,
  icons,
  items,
  mapping,
  npcs,
  placeables,
  scenes,
  shapes,
  shapers,
  terrain,
  textures,
  water,
  wearables,
  glass,
].forEach((x) => {
  Object.entries(x.getAssets()).forEach(([key, val]) => {
    assets.set(key, val);
  });
});

export function allAssets() {
  return Array.from(assets.entries()).sort();
}

export function hasAsset(key: string) {
  return assets.has(key);
}

export function matchingAssets(keyRe: RegExp) {
  return Array.from(assets.entries()).filter(([k, _]) => k.match(keyRe));
}

export function getAsset<T extends string>(key: string): l.GeneralNode<T> {
  assert.ok(assets.has(key), "Attempt to get non-existent asset");
  return assets.get(key)! as l.GeneralNode<T>;
}
