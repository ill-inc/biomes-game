import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { usingAll } from "@/shared/deletable";
import { ShardDiff } from "@/shared/ecs/gen/components";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import { Terrain } from "@/shared/game/terrain/terrain";
import { log } from "@/shared/logging";
import { ReadonlyVec3 } from "@/shared/math/types";
import { loadBlockWrapper, saveBlockWrapper } from "@/shared/wasm/biomes";
import { VoxelooModule } from "@/shared/wasm/types";

const [backupFile] = process.argv.slice(2);

// Iterates through all world voxels and checks to see if any diffs can be
// removed such that we simply refer to the seed tensor instead.

function applyFix(voxeloo: VoxelooModule, entity: PatchableEntity): boolean {
  if (!entity.shardDiff() || !entity.shardSeed() || !entity.shardPlacer()) {
    return false;
  }

  const terrain = new Terrain(voxeloo, entity);
  try {
    return usingAll([new voxeloo.SparseBlock_U32()], (diff) => {
      loadBlockWrapper(voxeloo, diff, entity.shardDiff());
      const deletions: ReadonlyVec3[] = [];
      diff.scan((x, y, z, value) => {
        const seedValue = terrain.seed.get(x, y, z);
        if (value !== seedValue) {
          return;
        }
        // If there's just no block here, and same with the seed,
        // then there's really no reason to keep this in the diff.
        if (seedValue === 0) {
          deletions.push([x, y, z]);
        }

        // Otherwise, as long as there's no placer associated with the
        // block, then we can just remove it from the diff and refer
        // to the seed.
        if (
          terrain.placer.get(x, y, z) === 0 &&
          terrain.occupancy.get(x, y, z) === 0
        ) {
          deletions.push([x, y, z]);
        }
      });

      if (deletions.length === 0) {
        // Nothing to do here.
        return false;
      }

      for (const [x, y, z] of deletions) {
        diff.del(x, y, z);
      }
      entity.setShardDiff(ShardDiff.create(saveBlockWrapper(voxeloo, diff)));
      return true;
    });
  } catch (error) {
    log.error("Error:", { error });
    return false;
  }
}

const voxeloo = await loadVoxeloo();
migrateEntities(
  backupFile,
  (entity) => applyFix(voxeloo, new PatchableEntity(entity)),
  (entity) => {
    applyFix(voxeloo, entity);
  }
);
