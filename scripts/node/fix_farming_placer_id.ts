import {
  migrateEntities,
  scanEntities,
} from "@/../scripts/node/abstract_migrate_script";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { usingAll } from "@/shared/deletable";
import {
  ShardDiff,
  ShardFarming,
  ShardGrowth,
  ShardPlacer,
} from "@/shared/ecs/gen/components";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import { SHARD_SHAPE } from "@/shared/game/shard";
import { BufferedTerrainTensor } from "@/shared/game/terrain/buffering/buffered_terrain_tensor";
import { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { ReadonlyVec3 } from "@/shared/math/types";
import { loadBlockWrapper, saveBlockWrapper } from "@/shared/wasm/biomes";
import { Tensor } from "@/shared/wasm/tensors";
import { VoxelooModule } from "@/shared/wasm/types";

async function main(backupFile: string) {
  // Iterates through all world voxels and enforces that placer matches farming
  // for voxels with farming values.
  // Also removes growth values if farming doesn't exist
  const existingPlantIds = new Set<BiomesId>();
  let deletedFarming = 0;
  let deletedGrowth = 0;
  let updatedPlacer = 0;
  let matchingVals = 0;

  function applyFix(voxeloo: VoxelooModule, entity: PatchableEntity): boolean {
    if (!entity.shardFarming() || !entity.shardPlacer()) {
      return false;
    }

    try {
      return usingAll(
        [
          new BufferedTerrainTensor(
            voxeloo,
            "F64",
            SHARD_SHAPE,
            Tensor.make(voxeloo, SHARD_SHAPE, "F64")
          ),
          new BufferedTerrainTensor(
            voxeloo,
            "F64",
            SHARD_SHAPE,
            Tensor.make(voxeloo, SHARD_SHAPE, "F64")
          ),
          new BufferedTerrainTensor(
            voxeloo,
            "U8",
            SHARD_SHAPE,
            Tensor.make(voxeloo, SHARD_SHAPE, "U8")
          ),
        ],
        (farming, placer, growth) => {
          farming.backing!.load(entity.shardFarming()?.buffer);
          placer.backing!.load(entity.shardPlacer()?.buffer);
          growth.backing!.load(entity.shardGrowth()?.buffer);

          for (const [[x, y, z], value] of farming.backing!) {
            const farmingId = value as BiomesId;
            const placerId = placer.get(x, y, z) as BiomesId;
            // Verify if the entity still exists
            if (!existingPlantIds.has(farmingId)) {
              farming.set(x, y, z, 0);
              if (placerId === farmingId) {
                placer.set(x, y, z, 0);
              }
              deletedFarming++;
            } else if (farmingId !== placerId) {
              placer.set(x, y, z, farmingId);
              updatedPlacer++;
            } else {
              matchingVals++;
            }
          }

          let changes = false;
          if (farming.dirty) {
            farming.commit();
            entity.setShardFarming(
              ShardFarming.create(farming.backing!.saveWrapped())
            );
            changes = true;
          }
          if (placer.dirty) {
            placer.commit();
            entity.setShardPlacer(
              ShardPlacer.create(placer.backing!.saveWrapped())
            );
            changes = true;
          }

          for (const [[x, y, z], value] of growth.backing!) {
            const farmingId = farming.get(x, y, z);
            if (value && !farmingId) {
              growth.set(x, y, z, 0);
              deletedGrowth++;
              changes = true;
            }
          }

          if (growth.dirty) {
            growth.commit();
            entity.setShardGrowth(
              ShardGrowth.create(growth.backing!.saveWrapped())
            );
            changes = true;
          }

          if (!changes) {
            return false;
          }
          return true;
        }
      );
    } catch (error) {
      log.error("Error:", { error });
      return false;
    }
  }

  const voxeloo = await loadVoxeloo();
  await scanEntities(backupFile, (entity) => {
    if (entity.farming_plant_component !== undefined) {
      existingPlantIds.add(entity.id);
    }
  });
  console.log("Found existing plant ids:", existingPlantIds.size);
  await migrateEntities(
    backupFile,
    (entity) => applyFix(voxeloo, new PatchableEntity(entity)),
    (entity) => {
      applyFix(voxeloo, entity);
    }
  );
  console.log("Deleted farming values:", deletedFarming);
  console.log("Updated placer values:", updatedPlacer);
  console.log("Matching values:", matchingVals);
  console.log("Deleted dangling growth:", deletedGrowth);
}

const [backupFile] = process.argv.slice(2);
main(backupFile);
