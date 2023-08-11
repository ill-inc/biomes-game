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
import { ok } from "assert";

async function migrateEntities(backupFile?: string) {
  if (!backupFile) {
    log.fatal(`Usage: node migrate_owned_by.js <backup_file>`);
    return;
  }

  await bootstrapGlobalSecrets("untrusted-apply-token");

  // 1. In first iteration, build a list of entity-to-group.

  const entityToGroup = new Map<BiomesId, BiomesId>();
  for await (const [_version, group] of iterBackupEntitiesFromFile(
    backupFile
  )) {
    if (!group.grouped_entities?.ids.length) {
      continue;
    }
    for (const entityId of group.grouped_entities.ids) {
      entityToGroup.set(entityId, group.id);
    }
  }

  // 2. In second iteration, get the full entities that are owned.

  const groupedEntities = new Map<
    BiomesId,
    { version: number; entity: Entity; groupId: BiomesId }
  >();
  for await (const [version, entity] of iterBackupEntitiesFromFile(
    backupFile
  )) {
    const groupId = entityToGroup.get(entity.id);
    if (entity.in_group?.id === groupId) {
      continue; // skip
    }
    ok(
      !entity.in_group,
      `Entity ${entity.id} had an unexpected group ${entity.in_group?.id} !== ${groupId}`
    );
    if (groupId)
      groupedEntities.set(entity.id, {
        version,
        entity,
        groupId,
      });
  }

  // Uncomment to do a "dry run" where the entities to migrate are listed.
  // for (const [_id, { entity, groupId }] of groupedEntities) {
  //   console.log(`Entity ${entity.id} is part of ${groupId}`);
  // }
  // return;

  // 3. Run the migration.

  const transactions: ChangeToApply[] = mapMap(
    groupedEntities,
    ({ entity, groupId: groupId, version }) => ({
      iffs: [[entity.id, version]],
      changes: [
        {
          kind: "update",
          entity: {
            id: entity.id,
            in_group: {
              id: groupId,
            },
          },
        },
      ],
    })
  );

  // Figure out who we are.
  console.log("Acquiring credentials...");
  const userId = await determineEmployeeUserId();
  const client = await createSyncClient(userId);

  // Ask for confirmation.
  console.log(
    `Updating ${transactions.length} entities with InGroup component.`
  );
  await promptToContinue();

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
