// The code below is a temporary hack to make some asset data available for
// creating scenes in art tools. We should migrate this code to fetch biscuits.

import simpleGlassDef from "@/../src/galois/data/glass/simple_glass.json";
import type { Block } from "@/client/components/art/blocks/data";
import bellFlowerDef from "@/client/components/art/data/bell_flower.json";
import cottonDef from "@/client/components/art/data/cotton.json";
import dirtDef from "@/client/components/art/data/dirt.json";
import grassDef from "@/client/components/art/data/grass.json";
import type { TFlora } from "@/client/components/art/florae/data";

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

export function grassBlock() {
  return clone(grassDef as Block);
}

export function dirtBlock() {
  return clone(dirtDef as Block);
}

export function cottonBlock() {
  return clone(cottonDef as Block);
}

export function simpleGlass() {
  return clone(simpleGlassDef as Block);
}

export function bellFlowerFlora() {
  return clone(bellFlowerDef as TFlora);
}
