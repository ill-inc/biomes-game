import * as l from "@/galois/lang";
import { assert } from "chai";

type FloraName = keyof typeof floraDefs;

export const floraDefs = {
  algae: l.ToFlora("flora/algae.json"),
  azalea_flower: l.ToFlora("flora/azalea_flower.json"),
  bamboo_bush: l.ToFlora("flora/bamboo_bush.json"),
  bell_flower: l.ToFlora("flora/bell_flower.json"),
  birch_leaf: l.ToFlora("flora/birch_leaf.json"),
  birch_sapling: l.ToFlora("flora/birch_sapling.json"),
  blue_mushroom: l.ToFlora("flora/blue_mushroom.json"),
  boxwood_shrub: l.ToFlora("flora/boxwood_shrub.json"),
  cactus: l.ToFlora("flora/cactus.json"),
  carrot_bush: l.ToFlora("flora/carrot_bush.json"),
  coffee_bush: l.ToFlora("flora/coffee_bush.json"),
  coral: l.ToFlora("flora/coral.json"),
  corn: l.ToFlora("flora/corn.json"),
  cotton_bush: l.ToFlora("flora/cotton_bush.json"),
  dandelion_flower: l.ToFlora("flora/dandelion_flower.json"),
  daylily_flower: l.ToFlora("flora/daylily_flower.json"),
  error_web: l.ToFlora("flora/error_web.json"),
  eye_plant: l.ToFlora("flora/eye_plant.json"),
  fescue_grass: l.ToFlora("flora/fescue_grass.json"),
  fire_flower: l.ToFlora("flora/fire_flower.json"),
  fly_trap: l.ToFlora("flora/fly_trap.json"),
  golden_mushroom: l.ToFlora("flora/golden_mushroom.json"),
  grapes: l.ToFlora("flora/grapes.json"),
  hemp_bush: l.ToFlora("flora/hemp_bush.json"),
  ivy_vine: l.ToFlora("flora/ivy_vine.json"),
  lilac_flower: l.ToFlora("flora/lilac_flower.json"),
  marigold_flower: l.ToFlora("flora/marigold_flower.json"),
  morningglory_flower: l.ToFlora("flora/morningglory_flower.json"),
  moss_grass: l.ToFlora("flora/moss_grass.json"),
  mucky_brambles: l.ToFlora("flora/mucky_brambles.json"),
  not_pumpkin: l.ToFlora("flora/pumpkin.json"),
  oak_leaf: l.ToFlora("flora/oak_leaf.json"),
  oak_sapling: l.ToFlora("flora/oak_sapling.json"),
  onion: l.ToFlora("flora/onion.json"),
  peony_flower: l.ToFlora("flora/peony_flower.json"),
  potato: l.ToFlora("flora/potato.json"),
  purple_mushroom: l.ToFlora("flora/purple_mushroom.json"),
  raspberry_bush: l.ToFlora("flora/raspberry_bush.json"),
  red_mushroom: l.ToFlora("flora/red_mushroom.json"),
  rose_flower: l.ToFlora("flora/rose_flower.json"),
  rubber_leaf: l.ToFlora("flora/rubber_leaf.json"),
  rubber_sapling: l.ToFlora("flora/rubber_sapling.json"),
  sakura_leaf: l.ToFlora("flora/sakura_leaf.json"),
  sakura_sapling: l.ToFlora("flora/sakura_sapling.json"),
  sapling: l.ToFlora("flora/sapling.json"),
  sea_anemone: l.ToFlora("flora/seaAnemone.json"),
  simple_flare: l.ToFlora("flora/simple_flare.json"),
  spider_web: l.ToFlora("flora/spider_web.json"),
  spiky_plant: l.ToFlora("flora/spiky_plant.json"),
  strawberry_bush: l.ToFlora("flora/strawberry_bush.json"),
  sun_flower: l.ToFlora("flora/sun_flower.json"),
  switch_grass: l.ToFlora("flora/switch_grass.json"),
  tangle_weed: l.ToFlora("flora/tangle_weed.json"),
  ultraviolet: l.ToFlora("flora/ultraviolet.json"),
  vines_bush: l.ToFlora("flora/vines_bush.json"),
  wheat_bush: l.ToFlora("flora/wheat.json"),
  tomato: l.ToFlora("flora/tomato.json"),
  radish: l.ToFlora("flora/radish.json"),
  sweet_corn: l.ToFlora("flora/sweetcorn.json"),
  cabbage: l.ToFlora("flora/cabbage.json"),
  turnip: l.ToFlora("flora/turnip.json"),
  golden_turnip: l.ToFlora("flora/golden_turnip.json"),
};

export const floraIDs = {
  oak_leaf: l.ToFloraID(1),
  birch_leaf: l.ToFloraID(2),
  rubber_leaf: l.ToFloraID(3),
  switch_grass: l.ToFloraID(4),
  azalea_flower: l.ToFloraID(5),
  bell_flower: l.ToFloraID(6),
  dandelion_flower: l.ToFloraID(7),
  daylily_flower: l.ToFloraID(8),
  lilac_flower: l.ToFloraID(9),
  rose_flower: l.ToFloraID(10),
  cotton_bush: l.ToFloraID(11),
  hemp_bush: l.ToFloraID(12),
  red_mushroom: l.ToFloraID(13),
  spider_web: l.ToFloraID(14),
  simple_flare: l.ToFloraID(15),
  fescue_grass: l.ToFloraID(16),
  moss_grass: l.ToFloraID(17),
  wheat_bush: l.ToFloraID(18),
  bamboo_bush: l.ToFloraID(19),
  ivy_vine: l.ToFloraID(20),
  boxwood_shrub: l.ToFloraID(21),
  sapling: l.ToFloraID(22),
  tangle_weed: l.ToFloraID(23),
  mucky_brambles: l.ToFloraID(24),
  carrot_bush: l.ToFloraID(25),
  raspberry_bush: l.ToFloraID(26),
  sakura_leaf: l.ToFloraID(27),
  error_web: l.ToFloraID(28),
  coffee_bush: l.ToFloraID(29),
  golden_mushroom: l.ToFloraID(30),
  birch_sapling: l.ToFloraID(31),
  oak_sapling: l.ToFloraID(32),
  potato: l.ToFloraID(33),
  not_pumpkin: l.ToFloraID(34),
  purple_mushroom: l.ToFloraID(35),
  rubber_sapling: l.ToFloraID(36),
  sakura_sapling: l.ToFloraID(37),
  vines_bush: l.ToFloraID(38),
  fly_trap: l.ToFloraID(39),
  eye_plant: l.ToFloraID(40),
  spiky_plant: l.ToFloraID(41),
  algae: l.ToFloraID(42),
  coral: l.ToFloraID(43),
  sea_anemone: l.ToFloraID(44),
  ultraviolet: l.ToFloraID(45),
  blue_mushroom: l.ToFloraID(46),
  fire_flower: l.ToFloraID(47),
  marigold_flower: l.ToFloraID(48),
  morningglory_flower: l.ToFloraID(49),
  peony_flower: l.ToFloraID(50),
  sun_flower: l.ToFloraID(51),
  corn: l.ToFloraID(52),
  onion: l.ToFloraID(53),
  cactus: l.ToFloraID(54),
  grapes: l.ToFloraID(55),
  strawberry_bush: l.ToFloraID(56),
  tomato: l.ToFloraID(57),
  radish: l.ToFloraID(58),
  sweet_corn: l.ToFloraID(59),
  cabbage: l.ToFloraID(60),
  turnip: l.ToFloraID(61),
  golden_turnip: l.ToFloraID(62),
};

assert.ok(
  Object.keys(floraIDs).every((key) => floraDefs[key as FloraName]),
  "floraIDs and floraDefs not in sync."
);

// Assemble the ID to block mappings.
const indexEntries: [l.FloraID, l.Flora][] = [];
for (const [name, id] of Object.entries(floraIDs)) {
  indexEntries.push([id, floraDefs[name as FloraName]]);
}

export const floraIndex = l.ToFloraIndex(indexEntries, floraIDs.error_web);
export const floraAtlas = l.ToAtlas(floraIndex);

const floraMeshes: Record<string, l.FloraItemMesh> = {};
for (const [name, id] of Object.entries(floraIDs)) {
  floraMeshes[`item_meshes/florae/${name}`] = l.ToItemMesh(id, floraIndex);
}

export function getAssets(): Record<string, l.Asset> {
  return {
    "atlases/florae": floraAtlas,
    "indices/florae": floraIndex,
    ...floraMeshes,
  };
}
