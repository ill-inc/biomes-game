import { TerrainMutator } from "@/server/gaia_v2/terrain/mutator";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { terrainDyeable } from "@/shared/asset_defs/quirk_helpers";
import { getTerrainID } from "@/shared/asset_defs/terrain";
import { ProposedChange } from "@/shared/ecs/change";
import { Entity, ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { DefaultMap } from "@/shared/util/collections";
import { changeEntities } from "../abstract_migrate_script";

const COUNTERS = new DefaultMap<string, { count: number }>(() => ({
  count: 0,
}));

const voxeloo = await loadVoxeloo();

function visitDyes(mutator: TerrainMutator) {
  if (!mutator.entity.shard_dye) {
    return;
  }

  // Find voxels that have a dye but shouldn't.
  for (const [pos, dye] of mutator.dye.tensor) {
    if (dye) {
      const id = mutator.diff.get(...pos);
      if (!id || !terrainDyeable(id)) {
        COUNTERS.get("voxelWithDyeThatCannotBeDyed").count += 1;
        mutator.dye.set(pos, 0);
      }
    }
  }
}

function visitGrowth(mutator: TerrainMutator) {
  // TODO: Make this accessible via bikkie or derived from the art assets.
  const GROWABLE_FLORA = new Set([
    getTerrainID("azalea_flower"),
    getTerrainID("bell_flower"),
    getTerrainID("birch_sapling"),
    getTerrainID("blue_mushroom"),
    getTerrainID("carrot_bush"),
    getTerrainID("coffee_bush"),
    getTerrainID("corn"),
    getTerrainID("cotton_bush"),
    getTerrainID("dandelion_flower"),
    getTerrainID("daylily_flower"),
    getTerrainID("fire_flower"),
    getTerrainID("golden_mushroom"),
    getTerrainID("hemp_bush"),
    getTerrainID("lilac_flower"),
    getTerrainID("marigold_flower"),
    getTerrainID("morningglory_flower"),
    getTerrainID("oak_sapling"),
    getTerrainID("onion"),
    getTerrainID("peony_flower"),
    getTerrainID("potato"),
    getTerrainID("pumpkin"),
    getTerrainID("purple_mushroom"),
    getTerrainID("raspberry_bush"),
    getTerrainID("red_mushroom"),
    getTerrainID("rose_flower"),
    getTerrainID("rubber_sapling"),
    getTerrainID("sakura_sapling"),
    getTerrainID("sun_flower"),
    getTerrainID("ultraviolet"),
    getTerrainID("wheat_bush"),
  ]);

  if (!mutator.entity.shard_growth) {
    return;
  }

  // Find voxels that have a growth but shouldn't.
  for (const [pos, growth] of mutator.growth.tensor) {
    if (growth) {
      const id = mutator.diff.get(...pos);
      if (!id || !GROWABLE_FLORA.has(id)) {
        COUNTERS.get("voxelWithDyeThatCannotBeDyed").count += 1;
        mutator.growth.set(pos, 0);
      }
    }
  }
}

function migrate(mutator: TerrainMutator) {
  visitDyes(mutator);
  visitGrowth(mutator);
}

function needsUpdate(entity: ReadonlyEntity) {
  if (Entity.has(entity, "box", "shard_seed")) {
    const mutator = new TerrainMutator(voxeloo, entity);
    try {
      migrate(mutator);
      const [changed] = mutator.apply();
      return changed;
    } finally {
      mutator.delete();
    }
  }
  return false;
}

function doUpdate(shard: ReadonlyEntity): ProposedChange | undefined {
  const mutator = new TerrainMutator(voxeloo, shard);
  try {
    migrate(mutator);
    const [changed, entity] = mutator.apply();
    if (changed) {
      return { kind: "update", entity };
    }
  } finally {
    mutator.delete();
  }
}

// Script that just re-runs getNpcSize on all of them.
const [backupFile] = process.argv.slice(2);

changeEntities(backupFile, needsUpdate, doUpdate, () => {
  console.log("COUNTERS:");
  for (const [key, val] of COUNTERS) {
    console.log(`${key} => ${val}`);
  }
});
