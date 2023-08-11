import { iterBackupEntitiesFromFile } from "@/server/backup/serde";
import {
  createSyncClient,
  determineEmployeeUserId,
} from "@/server/shared/bootstrap/sync";
import { createSignedApplyRequest } from "@/server/shared/ecs/untrusted";
import { scriptInit } from "@/server/shared/script_init";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { ChangeToApply } from "@/shared/api/transaction";
import {
  Isomorphism,
  isomorphismsEquivalent,
} from "@/shared/asset_defs/shapes";
import { TerrainID } from "@/shared/asset_defs/terrain";
import { loadShardsWithVersions } from "@/shared/batch/shards";
import { batchAsync, promptToContinue } from "@/shared/batch/util";
import { using } from "@/shared/deletable";
import {
  ShardDiff,
  ShardOccupancy,
  ShardShapes,
} from "@/shared/ecs/gen/components";
import {
  isomorphismForTensorEntry,
  scanGroupTensor,
  terrainIdForTensorEntry,
} from "@/shared/game/group";
import * as Shards from "@/shared/game/shard";
import { BufferedTerrainTensor } from "@/shared/game/terrain/buffering/buffered_terrain_tensor";
import { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { add } from "@/shared/math/linear";
import { Vec3 } from "@/shared/math/types";
import { saveBlockWrapper } from "@/shared/wasm/biomes";
import { Tensor } from "@/shared/wasm/tensors";
import { ok } from "assert";

async function migrateEntities(backupFile?: string) {
  if (!backupFile) {
    log.fatal(`Usage: node materialize_groups.js <backup_file>`);
    return;
  }

  await scriptInit(["untrusted-apply-token"]);
  const voxeloo = await loadVoxeloo();

  // Scan all groups and create map of group-occupied voxels.
  const shardToGroupVoxels = new Map<
    Shards.ShardId,
    [Vec3, BiomesId, TerrainID, Isomorphism | undefined][]
  >();
  for await (const [_version, entity] of iterBackupEntitiesFromFile(
    backupFile
  )) {
    if (entity.group_component && entity.box && !entity.iced) {
      const tensorBlob = entity.group_component.tensor;
      const box = entity.box;
      using(new voxeloo.GroupTensor(), (tensor) => {
        tensor.load(tensorBlob);
        for (const { tensorPos, tensorEntry } of scanGroupTensor(tensor)) {
          const worldPos = add(tensorPos, box.v0);
          const shardId = Shards.voxelShard(...worldPos);
          const blockPos = Shards.blockPos(...worldPos);
          if (!shardToGroupVoxels.has(shardId)) {
            shardToGroupVoxels.set(shardId, []);
          }
          const groupVoxels = shardToGroupVoxels.get(shardId);
          ok(groupVoxels);
          groupVoxels.push([
            blockPos,
            entity.id, // group ID
            terrainIdForTensorEntry(tensorEntry),
            isomorphismForTensorEntry(tensorEntry),
          ]);
        }
      });
    }
  }

  // Scan all terrain shards and migrate them if necessary.
  const transactions: ChangeToApply[] = [];
  const migratingGroups = new Set<BiomesId>();
  let migratingOccupancyCount = 0;
  let migratingDiffCount = 0;
  let migratingShapesCount = 0;
  await loadShardsWithVersions(
    voxeloo,
    iterBackupEntitiesFromFile(backupFile),
    (version, shard) => {
      if (shard.terrain) {
        using(
          Tensor.make(voxeloo, Shards.SHARD_SHAPE, "F64"),
          (occupancyTensor) => {
            ok(shard.terrain);

            const occupancyBacking = shard.occupancy ?? occupancyTensor;
            const occupancy = new BufferedTerrainTensor(
              voxeloo,
              "F64",
              Shards.SHARD_SHAPE,
              occupancyBacking
            );

            let migratingOccupancy = false;
            let migratingDiff = false;
            let migratingShapes = false;

            const shardId = Shards.voxelShard(...shard.aabb[0]);
            const groupVoxels = shardToGroupVoxels.get(shardId);
            if (groupVoxels) {
              for (const [
                blockPos,
                groupId,
                tensorTerrainId,
                tensorIsomorphism,
              ] of groupVoxels) {
                ok(shard.terrain);

                // Occupancy mismatch.
                if (shard.occupancy?.get(...blockPos) !== groupId) {
                  migratingOccupancy = true;
                  migratingOccupancyCount++;
                  migratingGroups.add(groupId);
                  occupancy.set(...blockPos, groupId);
                }

                // Terrain mismatch.
                if (shard.terrain.get(...blockPos) !== tensorTerrainId) {
                  migratingDiff = true;
                  migratingDiffCount++;
                  migratingGroups.add(groupId);
                  if (!shard.diff) {
                    shard.diff = new voxeloo.SparseBlock_U32();
                  }
                  shard.diff.set(...blockPos, tensorTerrainId);
                }

                // Shape mismatch.
                if (
                  !isomorphismsEquivalent(
                    shard.shapes?.get(...blockPos) ?? 0,
                    tensorIsomorphism ?? 0
                  )
                ) {
                  migratingShapes = true;
                  migratingShapesCount++;
                  migratingGroups.add(groupId);
                  if (!shard.shapes) {
                    shard.shapes = new voxeloo.SparseBlock_U32();
                  }
                  if (tensorIsomorphism) {
                    shard.shapes.set(...blockPos, tensorIsomorphism);
                  } else {
                    shard.shapes.del(...blockPos);
                  }
                }
              }
            }

            // Make sure to update the occupancy tensor.
            occupancy.commit();

            // Create proposed change if we need to migrate anything for this shard.
            if (migratingOccupancy || migratingDiff || migratingShapes) {
              const relevantComponentIds = [
                migratingOccupancy ? ShardOccupancy.ID : undefined,
                migratingDiff ? ShardDiff.ID : undefined,
                migratingShapes ? ShardShapes.ID : undefined,
              ].filter((e) => e !== undefined) as number[];
              transactions.push({
                iffs: [[shard.id, version, ...relevantComponentIds]],
                changes: [
                  {
                    kind: "update",
                    entity: {
                      id: shard.id,
                      shard_occupancy: migratingOccupancy
                        ? occupancyBacking.saveWrapped()
                        : undefined,
                      shard_diff: migratingDiff
                        ? saveBlockWrapper(voxeloo, shard.diff!)
                        : undefined,
                      shard_shapes: migratingShapes
                        ? saveBlockWrapper(voxeloo, shard.shapes!)
                        : undefined,
                    },
                  },
                ],
              });
            }
          }
        );
      }
    }
  );

  // Ask for confirmation.
  console.log(
    `Updating ${transactions.length} shards for ${migratingGroups.size} groups: ` +
      `${migratingOccupancyCount} occupancies, ${migratingDiffCount} edits, ${migratingShapesCount} shapes`
  );
  await promptToContinue();

  // Figure out who we are.
  console.log("Acquiring credentials...");
  const userId = await determineEmployeeUserId();
  const client = await createSyncClient(userId);

  // Actually perform the world update.
  console.log("Submitting changes...");
  for (const batch of batchAsync(transactions, 100)) {
    const request = createSignedApplyRequest(userId, batch);
    const response = await client.apply(request);
    console.log(response);
  }

  await client.close();
  console.log("All done.");
}

const [backupFile] = process.argv.slice(2);
migrateEntities(backupFile);
