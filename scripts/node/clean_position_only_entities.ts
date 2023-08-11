import { iterBackupEntitiesFromFile } from "@/server/backup/serde";
import {
  createSyncClient,
  determineEmployeeUserId,
} from "@/server/shared/bootstrap/sync";
import { createSignedApplyRequest } from "@/server/shared/ecs/untrusted";
import { bootstrapGlobalSecrets } from "@/server/shared/secrets";
import { ChangeToApply } from "@/shared/api/transaction";
import { batchAsync, promptToContinue } from "@/shared/batch/util";
import { Entity } from "@/shared/ecs/gen/entities";
import { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { mapMap } from "@/shared/util/collections";

async function cleanPositionOnlyEntities(backupFile?: string) {
  if (!backupFile) {
    log.fatal(`Usage: node clean_position_only_entities.js <backup_file>`);
    return;
  }

  await bootstrapGlobalSecrets("untrusted-apply-token");

  const positionOnlyEntities = new Map<
    BiomesId,
    { version: number; entity: Entity }
  >();
  for await (const [version, entity] of iterBackupEntitiesFromFile(
    backupFile
  )) {
    if (entity.position && Object.keys(entity).length === 2) {
      positionOnlyEntities.set(entity.id, { version, entity });
    }
  }

  // Uncomment to do a "dry run" where the entities to delete are listed.
  /*
  for (const [_id, { entity }] of positionOnlyEntities) {
    console.log(JSON.stringify(entity));
  }
  return;
  */

  const userId = await determineEmployeeUserId();
  const client = await createSyncClient(userId);

  const transactions: ChangeToApply[] = mapMap(
    positionOnlyEntities,
    ({ entity, version }) => ({
      iffs: [[entity.id, version]],
      changes: [
        {
          kind: "delete",
          id: entity.id,
        },
      ],
    })
  );

  console.log(
    `Removing ${transactions.length} entities that only have position components.`
  );
  await promptToContinue();

  // Submit change.
  for (const batch of batchAsync(transactions, 100)) {
    const request = createSignedApplyRequest(userId, batch);
    const response = await client.apply(request);
    console.log(response);
  }
  await client.close();
  console.log("All done.");
}

const [backupFile] = process.argv.slice(2);
cleanPositionOnlyEntities(backupFile);
