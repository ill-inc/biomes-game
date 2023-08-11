import { iterBackupEntitiesFromFile } from "@/server/backup/serde";
import {
  createSyncClient,
  determineEmployeeUserId,
} from "@/server/shared/bootstrap/sync";
import { createSignedApplyRequest } from "@/server/shared/ecs/untrusted";
import { scriptInit } from "@/server/shared/script_init";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { ChangeToApply } from "@/shared/api/transaction";
import { loadShardsWithVersions } from "@/shared/batch/shards";
import { batchAsync, promptToContinue } from "@/shared/batch/util";
import { ReadonlyShardOccupancy } from "@/shared/ecs/gen/components";
import { SHARD_SHAPE } from "@/shared/game/shard";
import { BufferedTerrainTensor } from "@/shared/game/terrain/buffering/buffered_terrain_tensor";
import { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { Vec3 } from "@/shared/math/types";

export async function sanitizeShards(backupFile?: string) {
  if (!backupFile) {
    log.fatal(`Usage: node sanitize_shards.js <backup_file>`);
    return;
  }

  await scriptInit(["untrusted-apply-token"]);
  const voxeloo = await loadVoxeloo();

  // Create an index of all group IDs that exist.
  const groupIds = new Set<BiomesId>();
  const placeableIds = new Set<BiomesId>();
  for await (const [, entity] of iterBackupEntitiesFromFile(backupFile)) {
    if (entity.iced) {
      continue;
    }
    if (entity.group_component) {
      groupIds.add(entity.id);
    }
    if (entity.placeable_component) {
      placeableIds.add(entity.id);
    }
  }

  // We detect and fix two kinds of failure cases right now:
  // 1. Phantom voxels that have an owner but not terrain.
  // 2. Orphaned voxels that have an owner that does not exist.
  // 3. Unknown voxels that have an unknown kind of owner.
  let voxelsThatSeemFine = 0;
  let voxelsOverlappingPlaceable = 0;
  let voxelsInGroupThatAreEmpty = 0;
  let voxelsWithUnknownOccupancy = 0;

  // Scan all terrain shards and remove bad ownership voxels.
  const shardFixes: [BiomesId, number, ReadonlyShardOccupancy][] = [];
  await loadShardsWithVersions(
    voxeloo,
    iterBackupEntitiesFromFile(backupFile),
    (version, shard) => {
      if (shard.terrain && shard.occupancy) {
        const bad: Vec3[] = [];
        for (const [pos, occupancyId] of shard.occupancy) {
          if (!occupancyId) {
            return;
          }
          const id = occupancyId as BiomesId;
          if (placeableIds.has(id)) {
            if (shard.terrain?.get(...pos)) {
              voxelsOverlappingPlaceable += 1;
            } else {
              voxelsThatSeemFine += 1;
            }
          } else if (groupIds.has(id)) {
            if (!shard.terrain?.get(...pos)) {
              voxelsInGroupThatAreEmpty += 1;
              bad.push(pos);
            } else {
              voxelsThatSeemFine += 1;
            }
          } else {
            bad.push(pos);
            voxelsWithUnknownOccupancy += 1;
          }
        }
        if (bad.length) {
          const occupancy = new BufferedTerrainTensor(
            voxeloo,
            "F64",
            SHARD_SHAPE,
            shard.occupancy
          );
          for (const [x, y, z] of bad) {
            occupancy.set(x, y, z, 0);
          }
          occupancy.commit();
          shardFixes.push([shard.id, version, shard.occupancy.saveWrapped()]);
        }
      }
    }
  );

  // Log some stats.
  console.log(`Found ${shardFixes.length} shards with bad occupancy data`);
  console.log(`voxelsThatSeemFine = ${voxelsThatSeemFine}`);
  console.log(`voxelsOverlappingPlaceable = ${voxelsOverlappingPlaceable}`);
  console.log(`voxelsInGroupThatAreEmpty = ${voxelsInGroupThatAreEmpty}`);
  console.log(`voxelsWithUnknownOccupancy = ${voxelsWithUnknownOccupancy}`);
  await promptToContinue();

  // Assemble the list of world updates.
  console.log("Preparing changes...");
  const transactions: ChangeToApply[] = [];
  for (const [id, version, shard_occupancy] of shardFixes) {
    transactions.push({
      iffs: [[id, version]],
      changes: [
        {
          kind: "update",
          entity: {
            id,
            shard_occupancy,
          },
        },
      ],
    });
  }

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
sanitizeShards(backupFile);
