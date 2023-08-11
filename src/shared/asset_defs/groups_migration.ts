import { ok } from "assert";

const TERRAIN_IDS_V0 = {
  azalea_flower: 19,
  basalt: 48,
  basalt_brick: 105,
  basalt_carved: 200,
  basalt_polished: 201,
  basalt_shingles: 202,
  bedrock: 7,
  bell_flower: 20,
  birch_leaf: 90,
  birch_log: 89,
  birch_lumber: 106,
  clay: 107,
  clay_brick: 108,
  clay_carved: 203,
  clay_polished: 204,
  clay_shingles: 205,
  coal_ore: 109,
  cobblestone: 4,
  cobblestone_brick: 110,
  cobblestone_carved: 206,
  cobblestone_polished: 207,
  cobblestone_shingles: 208,
  cotton_bush: 132,
  cotton_fabric: 209,
  dandelion_flower: 21,
  daylily_flower: 22,
  diamond: 111,
  diamond_chest: 112,
  diamond_ore: 113,
  dirt: 3,
  gold: 114,
  gold_chest: 115,
  gold_ore: 88,
  granite: 103,
  granite_brick: 116,
  granite_carved: 210,
  granite_polished: 211,
  granite_shingles: 212,
  grass: 2,
  gravel: 213,
  hay: 227,
  hemp_bush: 133,
  ice: 213,
  lilac_flower: 23,
  limestone: 49,
  limestone_brick: 117,
  limestone_carved: 214,
  limestone_polished: 215,
  limestone_shingles: 216,
  moss: 217,
  mushroom_leather: 218,
  neptunium: 118,
  neptunium_brick: 119,
  neptunium_ore: 120,
  oak_leaf: 87,
  oak_log: 17,
  oak_lumber: 121,
  pumpkin: 86,
  quartzite: 13,
  quartzite_brick: 131,
  quartzite_carved: 219,
  quartzite_polished: 220,
  quartzite_shingles: 221,
  red_mushroom: 134,
  rose_flower: 24,
  rubber_leaf: 130,
  rubber_log: 104,
  rubber_lumber: 125,
  silver: 126,
  silver_chest: 127,
  silver_ore: 128,
  snow: 222,
  stone: 1,
  stone_brick: 135,
  stone_carved: 223,
  stone_polished: 224,
  stone_shingles: 225,
  switch_grass: 18,
  template: 226,
  wood_crate: 129,
};

const TERRAIN_IDS_V1 = {
  azalea_flower: (1 << 24) + 5,
  basalt: 8,
  basalt_brick: 15,
  basalt_carved: 41,
  basalt_polished: 42,
  basalt_shingles: 100,
  bedrock: 6,
  bell_flower: (1 << 24) + 6,
  birch_leaf: (1 << 24) + 2,
  birch_log: 12,
  birch_lumber: 16,
  clay: 17,
  clay_brick: 18,
  clay_carved: 43,
  clay_polished: 44,
  clay_shingles: 101,
  coal_ore: 19,
  cobblestone: 5,
  cobblestone_brick: 20,
  cobblestone_carved: 45,
  cobblestone_polished: 46,
  cobblestone_shingles: 102,
  cotton_bush: (1 << 24) + 11,
  cotton_fabric: 33,
  dandelion_flower: (1 << 24) + 7,
  daylily_flower: (1 << 24) + 8,
  diamond: 21,
  diamond_chest: 22,
  diamond_ore: 23,
  dirt: 2,
  gold: 24,
  gold_chest: 25,
  gold_ore: 11,
  granite: 13,
  granite_brick: 26,
  granite_carved: 47,
  granite_polished: 48,
  granite_shingles: 103,
  grass: 1,
  gravel: 67,
  hay: 64,
  hemp_bush: (1 << 24) + 12,
  ice: 66,
  lilac_flower: (1 << 24) + 9,
  limestone: 9,
  limestone_brick: 27,
  limestone_carved: 49,
  limestone_polished: 50,
  limestone_shingles: 104,
  moss: 65,
  mushroom_leather: 34,
  neptunium: 28,
  neptunium_brick: 29,
  neptunium_ore: 30,
  oak_leaf: (1 << 24) + 1,
  oak_log: 3,
  oak_lumber: 31,
  pumpkin: 10,
  quartzite: 7,
  quartzite_brick: 32,
  quartzite_carved: 105,
  quartzite_polished: 106,
  quartzite_shingles: 107,
  red_mushroom: (1 << 24) + 13,
  rose_flower: (1 << 24) + 10,
  rubber_leaf: (1 << 24) + 3,
  rubber_log: 14,
  rubber_lumber: 34,
  silver: 36,
  silver_chest: 37,
  silver_ore: 38,
  snow: 108,
  stone: 4,
  stone_brick: 40,
  stone_carved: 53,
  stone_polished: 55,
  stone_shingles: 109,
  switch_grass: (1 << 24) + 4,
  template: 69,
  wood_crate: 39,
};

const TERRAIN_IDS_V2 = {
  azalea_flower: (1 << 24) + 5,
  basalt: 8,
  basalt_brick: 15,
  basalt_carved: 41,
  basalt_polished: 42,
  basalt_shingles: 43,
  bedrock: 6,
  bell_flower: (1 << 24) + 6,
  birch_leaf: (1 << 24) + 2,
  birch_log: 12,
  birch_lumber: 16,
  clay: 17,
  clay_brick: 18,
  clay_carved: 44,
  clay_polished: 45,
  clay_shingles: 46,
  coal_ore: 19,
  cobblestone: 5,
  cobblestone_brick: 20,
  cobblestone_carved: 47,
  cobblestone_polished: 48,
  cobblestone_shingles: 49,
  cotton_bush: (1 << 24) + 11,
  cotton_fabric: 38,
  dandelion_flower: (1 << 24) + 7,
  daylily_flower: (1 << 24) + 8,
  diamond: 21,
  diamond_chest: 80,
  diamond_ore: 23,
  dirt: 2,
  gold: 24,
  gold_chest: 81,
  gold_ore: 11,
  granite: 13,
  granite_brick: 26,
  granite_carved: 50,
  granite_polished: 51,
  granite_shingles: 52,
  grass: 1,
  gravel: 36,
  hay: 35,
  hemp_bush: (1 << 24) + 12,
  ice: 62,
  lilac_flower: (1 << 24) + 9,
  limestone: 9,
  limestone_brick: 27,
  limestone_carved: 53,
  limestone_polished: 54,
  limestone_shingles: 55,
  moss: 40,
  mushroom_leather: 39,
  neptunium: 28,
  neptunium_brick: 82,
  neptunium_ore: 30,
  oak_leaf: (1 << 24) + 1,
  oak_log: 3,
  oak_lumber: 31,
  pumpkin: 10,
  quartzite: 7,
  quartzite_brick: 32,
  quartzite_carved: 56,
  quartzite_polished: 57,
  quartzite_shingles: 58,
  red_mushroom: (1 << 24) + 13,
  rose_flower: (1 << 24) + 10,
  rubber_leaf: (1 << 24) + 3,
  rubber_log: 14,
  rubber_lumber: 34,
  silver: 33,
  silver_chest: 83,
  silver_ore: 25,
  snow: 37,
  stone: 4,
  stone_brick: 29,
  stone_carved: 59,
  stone_polished: 60,
  stone_shingles: 61,
  switch_grass: (1 << 24) + 4,
  template: 69,
  wood_crate: 22,
};

type TerrainNameV0 = keyof typeof TERRAIN_IDS_V0;
type TerrainNameV1 = keyof typeof TERRAIN_IDS_V1;
type TerrainNameV2 = keyof typeof TERRAIN_IDS_V2;

const terrainNamesMap0 = new Map<number, string>();
for (const [name, id] of Object.entries(TERRAIN_IDS_V0)) {
  terrainNamesMap0.set(id, name);
}

const terrainNamesMap1 = new Map<number, string>();
for (const [name, id] of Object.entries(TERRAIN_IDS_V1)) {
  terrainNamesMap1.set(id, name);
}

const terrainNamesMap2 = new Map<number, string>();
for (const [name, id] of Object.entries(TERRAIN_IDS_V2)) {
  terrainNamesMap2.set(id, name);
}

export function idsToNamesV0(ids: number[]) {
  const ret = [];
  for (const id of ids) {
    ok(terrainNamesMap0.has(id));
    ret.push(terrainNamesMap0.get(id));
  }
  return ret;
}

export function idsToNamesV1(ids: number[]) {
  const ret = [];
  for (const id of ids) {
    ok(terrainNamesMap1.has(id));
    ret.push(terrainNamesMap1.get(id));
  }
  return ret;
}

export function idsToNamesV2(ids: number[]) {
  const ret = [];
  for (const id of ids) {
    ok(terrainNamesMap2.has(id));
    ret.push(terrainNamesMap2.get(id));
  }
  return ret;
}

export function remap0to1(ids: number[]) {
  const ret = [];
  for (const id of idsToNamesV0(ids)) {
    const out = TERRAIN_IDS_V1[id as TerrainNameV1];
    ok(out !== undefined);
    ret.push(out);
  }
  return ret;
}

export function remap1to2(ids: number[]) {
  const ret = [];
  for (const id of idsToNamesV1(ids)) {
    const out = TERRAIN_IDS_V2[id as TerrainNameV2];
    ok(out !== undefined);
    ret.push(out);
  }
  return ret;
}

export function remap2to1(ids: number[]) {
  const ret = [];
  for (const id of idsToNamesV2(ids)) {
    const out = TERRAIN_IDS_V0[id as TerrainNameV0];
    ok(out !== undefined);
    ret.push(out);
  }
  return ret;
}
