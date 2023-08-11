import { loadBikkieForScript } from "@/../scripts/node/helpers/bikkie";
import { iterBackupEntitiesFromFile } from "@/server/backup/serde";
import {
  createSyncClient,
  determineEmployeeUserId,
} from "@/server/shared/bootstrap/sync";
import { createSignedApplyRequest } from "@/server/shared/ecs/untrusted";
import { SecretKey, bootstrapGlobalSecrets } from "@/server/shared/secrets";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { ChangeToApply } from "@/shared/api/transaction";
import { batchAsync, promptToContinue } from "@/shared/batch/util";
import {
  ProposedChange,
  applyProposedChange,
  changedBiomesId,
} from "@/shared/ecs/change";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import { Entity, ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { ShardId, shardEncode, voxelToShardPos } from "@/shared/game/shard";
import { ReadonlyTerrain, Terrain } from "@/shared/game/terrain/terrain";
import { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { mapMap } from "@/shared/util/collections";
import { ok } from "assert";

export async function changeEntities(
  backupFile: string,
  checkForUpgrade: (e: ReadonlyEntity) => boolean | Promise<boolean>,
  generateChange: (
    e: Entity
  ) => ProposedChange | undefined | Promise<ProposedChange | undefined>,
  beforeCommit = () => {}
) {
  if (!backupFile) {
    log.fatal(`Missing backup file!`);
    return;
  }

  const runningInProd = await bootstrapMigration();

  console.log("Scanning backup...");

  const needsUpgrade = new Map<BiomesId, { version: number; entity: Entity }>();
  for await (const [version, entity] of iterBackupEntitiesFromFile(
    backupFile
  )) {
    if (!(await checkForUpgrade(entity))) {
      continue;
    }
    needsUpgrade.set(entity.id, { version, entity });
  }

  console.log(
    `${needsUpgrade.size} entities need upgrade, fetching latest versions...`
  );

  // Get the latest version of all entities we need to upgrade.
  console.log("Acquiring credentials...");
  const userId = await determineEmployeeUserId();
  const client = await createSyncClient(userId);
  {
    const fetchTransactions = mapMap(
      needsUpgrade,
      ({ version }, id) =>
        ({
          iffs: [],
          changes: [],
          events: [],
          catchups: [[id, version]],
        } as ChangeToApply)
    );
    for (const batch of batchAsync(fetchTransactions, 100)) {
      const request = createSignedApplyRequest(userId, batch);
      const [, changes] = await client.apply(request);
      for (const { change } of changes) {
        const id = changedBiomesId(change);
        const match = needsUpgrade.get(id);
        if (!match) {
          continue;
        }
        match.version = change.tick;
        const newEntity = applyProposedChange(match.entity, change);
        if (!newEntity) {
          needsUpgrade.delete(id);
        } else {
          match.entity = newEntity as Entity;
        }
      }
    }
  }

  for (const [id, { entity }] of needsUpgrade) {
    const change = await generateChange(entity);
    if (change === undefined) {
      continue;
    }
    ok(changedBiomesId(change) === entity.id);
    log.debug(`Entity ${entity.label?.text ?? id} needing upgrade`, { change });
  }

  if (needsUpgrade.size === 0) {
    log.info("No entities to migrate");
    return;
  }

  // Ask for confirmation, user can exit now.
  log.info(
    `Ready to update ${needsUpgrade.size} entities (${
      runningInProd ? "in prod" : "locally"
    })`
  );

  beforeCommit();
  await promptToContinue();

  // Figure out who we are.

  while (needsUpgrade.size > 0) {
    const transactions: ChangeToApply[] = [];
    for (const { version, entity } of needsUpgrade.values()) {
      if (!checkForUpgrade(entity)) {
        needsUpgrade.delete(entity.id);
        continue;
      }
      const change = await generateChange(entity);
      if (change === undefined) {
        needsUpgrade.delete(entity.id);
        continue;
      }
      ok(changedBiomesId(change) === entity.id);

      transactions.push({
        iffs: [[entity.id, version]],
        changes: [change],
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
        const match = needsUpgrade.get(id);
        if (!match) {
          continue;
        }
        match.version = change.tick;
        const newEntity = applyProposedChange(match.entity, change);
        if (!newEntity) {
          needsUpgrade.delete(id);
        } else {
          match.entity = newEntity as Entity;
        }
      }
    }
  }
  await client.close();
  console.log("All done.");
}

export async function migrateEntities(
  backupFile: string,
  checkForUpgrade: (e: ReadonlyEntity) => boolean | Promise<boolean>,
  generateDelta: (e: PatchableEntity) => void | "delete",
  beforeCommit = () => {}
) {
  return changeEntities(
    backupFile,
    checkForUpgrade,
    (e) => {
      const patch = new PatchableEntity(e);
      const action = generateDelta(patch);
      if (action === "delete") {
        return {
          kind: "delete",
          id: e.id,
        };
      }
      const delta = patch.finish();
      if (delta === undefined) {
        return undefined;
      }
      return {
        kind: "update",
        entity: delta,
      };
    },
    beforeCommit
  );
}

export async function scanEntities(
  backupFile: string,
  fn: (e: ReadonlyEntity, version: number) => void | Promise<void>
) {
  await bootstrapMigration();
  for await (const [version, entity] of iterBackupEntitiesFromFile(
    backupFile
  )) {
    await fn(entity, version);
  }
}

export async function migrateTerrain(
  backupFile: string,
  checkForUpgrade: (
    terrain: ReadonlyTerrain,
    shardId: ShardId
  ) => boolean | Promise<boolean>,
  generateDelta: (terrain: Terrain, shardId: ShardId) => void,
  beforeCommit = () => {}
) {
  const voxeloo = await loadVoxeloo();
  return changeEntities(
    backupFile,
    (entity) => {
      if (!entity.shard_seed || !entity.box) {
        return false;
      }
      const terrain = new ReadonlyTerrain(voxeloo, entity);
      const shardId = shardEncode(...voxelToShardPos(...entity.box!.v0));
      return checkForUpgrade(terrain, shardId);
    },
    (entity) => {
      const terrain = new Terrain(voxeloo, entity);
      const shardId = shardEncode(...voxelToShardPos(...entity.box!.v0));
      generateDelta(terrain, shardId);
      terrain.commit();
      const delta = terrain.finish();
      if (delta === undefined) {
        return;
      }
      return {
        kind: "update",
        entity: delta,
      };
    },
    beforeCommit
  );
}

export async function bootstrapMigration() {
  const runningInProd = !process.env.BIOMES_OVERRIDE_SYNC;
  if (runningInProd) {
    log.warn("Script will apply to prod...");
  } else {
    log.info(
      "Script will run against local dev server, make sure it's running..."
    );
  }
  const additionalSecrets: SecretKey[] = runningInProd
    ? ["untrusted-apply-token"]
    : [];
  await bootstrapGlobalSecrets(...additionalSecrets);
  await loadBikkieForScript();
  await loadVoxeloo();
  return runningInProd;
}
