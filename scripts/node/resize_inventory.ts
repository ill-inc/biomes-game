import { iterBackupEntitiesFromFile } from "@/server/backup/serde";
import {
  createSyncClient,
  determineEmployeeUserId,
} from "@/server/shared/bootstrap/sync";
import { createSignedApplyRequest } from "@/server/shared/ecs/untrusted";
import { bootstrapGlobalSecrets } from "@/server/shared/secrets";
import { ChangeToApply } from "@/shared/api/transaction";
import { batchAsync, promptToContinue } from "@/shared/batch/util";
import { applyProposedChange, changedBiomesId } from "@/shared/ecs/change";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import { Entity } from "@/shared/ecs/gen/entities";
import { PLAYER_INVENTORY_SLOTS } from "@/shared/game/inventory";
import { addToBag } from "@/shared/game/items";
import { isPlayer } from "@/shared/game/players";
import { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";

async function migrateEntities(backupFile?: string) {
  if (!backupFile) {
    log.fatal(`Usage: node resize_inventory.js <backup_file>`);
    return;
  }

  await bootstrapGlobalSecrets("untrusted-apply-token");

  const playersWithIncorrectInventorySize = new Map<
    BiomesId,
    { version: number; entity: Entity }
  >();
  for await (const [version, entity] of iterBackupEntitiesFromFile(
    backupFile
  )) {
    if (!isPlayer(entity) || !entity.inventory) {
      continue;
    }
    if (entity.inventory.items.length === PLAYER_INVENTORY_SLOTS) {
      continue;
    }
    playersWithIncorrectInventorySize.set(entity.id, { version, entity });
  }

  for (const [id, entity] of playersWithIncorrectInventorySize) {
    log.debug(`Player ${id} with incorrect inventory size`, {
      entity,
    });
  }
  // Uncomment to do a "dry run" where the entities to migrate are listed.
  // return;

  // Ask for confirmation.
  console.log(
    `Updating ${playersWithIncorrectInventorySize.size} players with incorrect inventory size.`
  );
  await promptToContinue();

  // Figure out who we are.
  console.log("Acquiring credentials...");
  const userId = await determineEmployeeUserId();
  const client = await createSyncClient(userId);

  while (playersWithIncorrectInventorySize.size > 0) {
    const transactions: ChangeToApply[] = [];
    for (const {
      version,
      entity,
    } of playersWithIncorrectInventorySize.values()) {
      if (
        !entity.inventory ||
        entity.inventory.items.length === PLAYER_INVENTORY_SLOTS
      ) {
        playersWithIncorrectInventorySize.delete(entity.id);
        continue;
      }

      const patch = new PatchableEntity(entity);
      const mutableItems = patch.mutableInventory().items;
      for (let i = mutableItems.length - 1; i >= PLAYER_INVENTORY_SLOTS; i--) {
        const itemAtSlot = mutableItems[i];
        if (itemAtSlot) {
          addToBag(patch.mutableInventory().overflow, itemAtSlot);
          mutableItems[i] = undefined;
        }
      }
      if (mutableItems.length > PLAYER_INVENTORY_SLOTS) {
        mutableItems.length = PLAYER_INVENTORY_SLOTS;
      } else {
        mutableItems.push(
          ...new Array(PLAYER_INVENTORY_SLOTS - mutableItems.length).fill(
            undefined
          )
        );
      }
      const delta = patch.finish();
      if (delta === undefined) {
        continue;
      }
      transactions.push({
        iffs: [[delta.id, version]],
        changes: [
          {
            kind: "update",
            entity: delta,
          },
        ],
      });
    }

    // Actually perform the world update.
    console.log("Submitting changes...");
    for (const batch of batchAsync(transactions, 100)) {
      const request = createSignedApplyRequest(userId, batch);
      const [outcomes, changes] = await client.apply(request);
      log.info("Applied changes", { outcomes });
      for (const { change } of changes) {
        const id = changedBiomesId(change);
        const match = playersWithIncorrectInventorySize.get(id);
        if (!match) {
          continue;
        }
        match.version = change.tick;
        const newEntity = applyProposedChange(match.entity, change);
        if (!newEntity || !newEntity.inventory) {
          playersWithIncorrectInventorySize.delete(id);
        } else {
          match.entity = newEntity as Entity;
        }
      }
    }
  }
  await client.close();
  console.log("All done.");
}

const [backupFile] = process.argv.slice(2);
migrateEntities(backupFile);
