import { newPlayer } from "@/server/logic/utils/players";
import {
  createSyncClient,
  determineEmployeeUserId,
} from "@/server/shared/bootstrap/sync";
import { createSignedApplyRequest } from "@/server/shared/ecs/untrusted";
import { scriptInit } from "@/server/shared/script_init";
import type { BDB } from "@/server/shared/storage";
import { createBdb, createStorageBackend } from "@/server/shared/storage";
import type { FirestoreUser } from "@/server/web/db/types";
import { ChangeToApply } from "@/shared/api/transaction";
import { applyProposedChange, changedBiomesId } from "@/shared/ecs/change";
import { UserRoles } from "@/shared/ecs/gen/components";
import { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { WithId } from "@/shared/util/type_helpers";
import { chunk, uniq } from "lodash";
import { loadBikkieForScript } from "./helpers/bikkie";

async function getAllUsers(
  db: BDB
): Promise<WithId<FirestoreUser, BiomesId>[]> {
  const result = await db.collection("users").get();
  return result.docs.map((e) => ({
    ...e.data()!,
    id: parseBiomesId(e.id),
  }));
}

async function main() {
  await scriptInit(["untrusted-apply-token"]);

  const storage = await createStorageBackend("firestore");
  const db = createBdb(storage);

  await loadBikkieForScript();

  const allUsers = await getAllUsers(db);
  log.info(`Found ${allUsers.length} users`);

  const MAX_AGE_MS = 16 * 24 * 3600 * 1000; // 16 days.
  const oldUsers = allUsers.filter(
    (u) => u.createMs === undefined || u.createMs < Date.now() - MAX_AGE_MS
  );
  log.info(`Found ${oldUsers.length} old users`);

  const resetUsers = uniq(
    oldUsers.filter(
      (u) =>
        ![5518985451091899, 8277444529729840, 8567554765071677].includes(u.id)
    )
  );

  console.log("Acquiring credentials...");
  const userId = await determineEmployeeUserId();
  const client = await createSyncClient(userId);

  const fetchEntities = async (ids: BiomesId[]) => {
    const fetchTransactions = ids.map(
      (id) =>
        <ChangeToApply>{
          iffs: [],
          changes: [],
          events: [],
          catchups: [[id, 0]],
        }
    );
    const request = createSignedApplyRequest(userId, fetchTransactions);
    const [, changes] = await client.apply(request);
    const entities = new Map<BiomesId, ReadonlyEntity>();
    for (const { change } of changes) {
      const id = changedBiomesId(change);
      const existing = entities.get(id);
      const updated = applyProposedChange(existing, change);
      if (updated === undefined) {
        entities.delete(id);
      } else {
        entities.set(id, updated);
      }
    }
    return entities;
  };

  for (const batch of chunk(resetUsers, 100)) {
    const changesToApply: ChangeToApply[] = [];

    const existing = await fetchEntities(batch.map(({ id }) => id));
    for (const { id, username } of batch) {
      if (!username) {
        changesToApply.push({
          iffs: [[id]], // Conditional on existence.
          changes: [
            {
              kind: "delete",
              id,
            },
          ],
        });
        continue;
      }

      const entity = { ...newPlayer(id, username), iced: {} };
      const found = existing.get(id);
      if (found?.user_roles) {
        entity.user_roles = UserRoles.clone(found.user_roles);
      }
      changesToApply.push({
        iffs: [[id]], // Conditional on existence.
        changes: [
          {
            kind: "create",
            entity,
          },
        ],
      });
    }

    if (changesToApply.length === 0) {
      continue;
    }
    log.info("Resetting users", {
      names: batch.map(({ id, username }) => username ?? String(id)),
    });
    const request = createSignedApplyRequest(userId, changesToApply);
    await client.apply(request);
  }

  await client.close();
  log.info("All Done!");
}

main();
