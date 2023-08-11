import { iterBackupEntitiesFromFile } from "@/server/backup/serde";
import {
  createSyncClient,
  determineEmployeeUserId,
} from "@/server/shared/bootstrap/sync";
import { createSignedApplyRequest } from "@/server/shared/ecs/untrusted";
import { scriptInit } from "@/server/shared/script_init";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { ChangeToApply } from "@/shared/api/transaction";
import { getTerrainID } from "@/shared/asset_defs/terrain";
import { loadShardsWithVersions } from "@/shared/batch/shards";
import { batchAsync, promptToContinue } from "@/shared/batch/util";
import { ReadonlyShardDiff } from "@/shared/ecs/gen/components";
import { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { saveBlockWrapper, scanBlock } from "@/shared/wasm/biomes";

export async function restoreBedrock(backupFile?: string) {
  if (!backupFile) {
    log.fatal(`Usage: node restore_bedrock.js <backup_file>`);
    return;
  }

  await scriptInit(["untrusted-apply-token"]);
  const voxeloo = await loadVoxeloo();

  // Scan all terrain shards and remove bad ownership voxels.
  const shardFixes: [BiomesId, number, ReadonlyShardDiff][] = [];
  await loadShardsWithVersions(
    voxeloo,
    iterBackupEntitiesFromFile(backupFile),
    (version, shard) => {
      if (shard.seed && shard.diff) {
        let changed = false;
        scanBlock(voxeloo, shard.diff, (pos, val) => {
          if (shard.seed!.get(...pos) === getTerrainID("bedrock")) {
            shard.diff?.del(...pos);
            changed = true;
          }
        });
        if (changed) {
          shardFixes.push([
            shard.id,
            version,
            saveBlockWrapper(voxeloo, shard.diff!),
          ]);
        }
      }
    }
  );

  // Log some stats.
  console.log(`Found ${shardFixes.length} shards with edited bedrock`);
  await promptToContinue();

  // Assemble the list of world updates.
  console.log("Preparing changes...");
  const transactions: ChangeToApply[] = [];
  for (const [id, version, shard_diff] of shardFixes) {
    transactions.push({
      iffs: [[id, version]],
      changes: [
        {
          kind: "update",
          entity: {
            id,
            shard_diff,
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
restoreBedrock(backupFile);
