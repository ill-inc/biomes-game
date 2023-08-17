import type { AssetPath } from "@/galois/interface/asset_paths";
import * as l from "@/galois/lang";

export const audioAssets = {
  footsteps: ["audio/footsteps-dirt"],

  block_break: [
    "audio/block-break-1",
    "audio/block-break-2",
    "audio/block-break-3",
  ],

  block_hit_dirt: [
    "audio/block-hit-dirt-1",
    "audio/block-hit-dirt-2",
    "audio/block-hit-dirt-3",
    "audio/block-hit-dirt-4",
    "audio/block-hit-dirt-5",
    "audio/block-hit-dirt-6",
  ],
  block_hit_grass: [
    "audio/block-hit-grass-1",
    "audio/block-hit-grass-2",
    "audio/block-hit-grass-3",
    "audio/block-hit-grass-4",
    "audio/block-hit-grass-5",
    "audio/block-hit-grass-6",
  ],
  block_hit_stone: [
    "audio/block-hit-stone-1",
    "audio/block-hit-stone-2",
    "audio/block-hit-stone-3",
    "audio/block-hit-stone-4",
    "audio/block-hit-stone-5",
    "audio/block-hit-stone-6",
  ],
  block_hit_wood: [
    "audio/block-hit-wood-1",
    "audio/block-hit-wood-2",
    "audio/block-hit-wood-3",
    "audio/block-hit-wood-4",
    "audio/block-hit-wood-5",
    "audio/block-hit-wood-6",
  ],
  unbreakable_block_hit: ["audio/unbreakable-block-hit"],

  camera_flip: ["audio/camera-flip"],
  camera_shutter: ["audio/camera-shutter"],

  drop_collect: ["audio/drop-collect"],
  bling_collect: ["audio/bling-collect"],

  footstep_dirt: [
    "audio/footstep-dirt-1",
    "audio/footstep-dirt-2",
    "audio/footstep-dirt-3",
    "audio/footstep-dirt-4",
    "audio/footstep-dirt-5",
    "audio/footstep-dirt-6",
  ],
  footstep_grass: [
    "audio/footstep-grass-1",
    "audio/footstep-grass-2",
    "audio/footstep-grass-3",
    "audio/footstep-grass-4",
    "audio/footstep-grass-5",
  ],
  footstep_stone: [
    "audio/footstep-stone-1",
    "audio/footstep-stone-2",
    "audio/footstep-stone-3",
    "audio/footstep-stone-4",
    "audio/footstep-stone-5",
    "audio/footstep-stone-6",
  ],
  footstep_wood: [
    "audio/footstep-wood-1",
    "audio/footstep-wood-2",
    "audio/footstep-wood-3",
    "audio/footstep-wood-4",
    "audio/footstep-wood-5",
    "audio/footstep-wood-6",
  ],

  camera_select: ["audio/camera-select"],
  item_select: ["audio/item-select"],

  fish_cast_land_water: ["audio/fish-cast-land-water"],
  fish_cast: ["audio/fish-cast"],
  fish_reel: ["audio/fish-reel"],

  player_warp: ["audio/player-warp"],

  music: ["audio/music-1"],
  muck_music: ["audio/muck-music-1"],

  npc_muckling_on_death: ["audio/npc-muckling-on-death-1"],
  npc_muckling_on_hit: [
    "audio/npc-muckling-on-hit-1",
    "audio/npc-muckling-on-hit-2",
  ],
  npc_muckling_on_attack: [
    "audio/npc-muckling-on-attack-1",
    "audio/npc-muckling-on-attack-2",
  ],

  npc_mucker_on_death: ["audio/npc-mucker-on-death-1"],
  npc_mucker_on_hit: ["audio/npc-mucker-on-hit-1", "audio/npc-mucker-on-hit-2"],
  npc_mucker_on_attack: [
    "audio/npc-mucker-on-attack-1",
    "audio/npc-mucker-on-attack-2",
  ],

  npc_cow_idle: ["audio/npc-cow-idle-1"],

  place_block: [
    "audio/place-block-1",
    "audio/place-block-2",
    "audio/place-block-3",
    "audio/place-block-4",
  ],

  plant_hit: ["audio/plant-hit-1", "audio/plant-hit-2", "audio/plant-hit-3"],

  splash: ["audio/splash-1", "audio/splash-2", "audio/splash-3"],

  swing: ["audio/swing-1", "audio/swing-2", "audio/swing-3", "audio/swing-4"],

  button_click: ["audio/button-click"],
  challenge_complete: ["audio/challenge-complete"],
  challenge_progress: ["audio/challenge-progress"],
  craft_success: ["audio/craft-success"],
  dialog_close: ["audio/dialog-close"],
  dialog_open: ["audio/dialog-open"],
  inventory_close: ["audio/block-break-2"],
  inventory_open: ["audio/block-break-1"],
  wearable_equip: ["audio/block-break-1"],

  campfire: ["audio/campfire"],
  disco: ["audio/disco"],
  arcade: ["audio/arcade"],

  buff_eat: ["audio/buff-eat"],
  buff_drink: ["audio/buff-drink"],
  spoiled_food: ["audio/spoiled-food"],

  blueprint_complete: ["audio/blueprint-complete"],

  checkpoint_reached: ["audio/checkpoint-reached"],

  forbidden: ["audio/forbidden"],

  applause: ["audio/applause"],
};

export type AudioAssetType = keyof typeof audioAssets;

export function getAudioAssetPaths(assetType: AudioAssetType): AssetPath[] {
  return audioAssets[assetType] as AssetPath[];
}

export const audioFiles = Object.entries(audioAssets).flatMap(
  ([_name, assets]) => {
    return assets;
  }
);

export function getAssets(): Record<string, l.Asset> {
  return {
    ...Object.fromEntries(audioFiles.map((x) => [x, l.LoadWEBM(`${x}.webm`)])),
  };
}
