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
import { using } from "@/shared/deletable";
import {
  OccupancyComponent,
  PlacerComponent,
} from "@/shared/ecs/gen/components";
import { SHARD_SHAPE } from "@/shared/game/shard";
import { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { Tensor, TensorUpdate } from "@/shared/wasm/tensors";

// Split shard occupancy to separate occupancy and placer tensors.

async function migrateEntities(backupFile?: string) {
  if (!backupFile) {
    log.fatal(`Usage: node migrate_placer.js <backup_file>`);
    return;
  }

  await scriptInit(["untrusted-apply-token"]);
  const voxeloo = await loadVoxeloo();

  // Get a set of player BiomesIDs.
  const players = new Set<BiomesId>();
  for await (const [_version, entity] of iterBackupEntitiesFromFile(
    backupFile
  )) {
    if (entity.remote_connection) {
      players.add(entity.id);
    }
  }

  const transactions: ChangeToApply[] = [];
  await loadShardsWithVersions(
    voxeloo,
    iterBackupEntitiesFromFile(backupFile),
    (version, shard) => {
      using(Tensor.make(voxeloo, SHARD_SHAPE, "F64"), (newTensor) => {
        if (!shard.occupancy) {
          return;
        }
        const occupancyWriter = new TensorUpdate(shard.occupancy);

        const placerTensor = shard.placer ?? newTensor;
        const placerWriter = new TensorUpdate(placerTensor);

        let migratingOccupancy = false;
        let migratingPlacer = false;
        for (const [pos, occupancyId] of shard.occupancy) {
          if (!players.has(occupancyId as BiomesId)) {
            return;
          }
          occupancyWriter.set(pos, 0);
          migratingOccupancy = true;
          if (shard.placer?.get(...pos) === occupancyId) {
            return;
          }
          placerWriter.set(pos, occupancyId);
          migratingPlacer = true;
        }

        if (migratingOccupancy) {
          occupancyWriter.apply();
          placerWriter.apply();
          transactions.push({
            iffs: [
              [shard.id, version, OccupancyComponent.ID, PlacerComponent.ID],
            ],
            changes: [
              {
                kind: "update",
                entity: {
                  id: shard.id,
                  shard_occupancy: shard.occupancy.saveWrapped(),
                  shard_placer: migratingPlacer
                    ? placerTensor.saveWrapped()
                    : undefined,
                },
              },
            ],
          });
        }
      });
    }
  );

  // Ask for confirmation.
  console.log(
    `Updating ${transactions.length} shards for ${players.size} players`
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
