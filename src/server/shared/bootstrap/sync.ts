import type { Bootstrap } from "@/server/shared/bootstrap/bootstrap";
import { getGCloudAccount } from "@/server/shared/google_adc";
import { SessionStore } from "@/server/web/db/sessions";
import type { SyncClient } from "@/shared/api/sync";
import { zSyncService } from "@/shared/api/sync";
import type { Delivery } from "@/shared/chat/types";
import type { Change } from "@/shared/ecs/change";
import { ChangeBuffer, changedBiomesId } from "@/shared/ecs/change";
import { WorldMetadataId } from "@/shared/ecs/ids";
import type { VersionMap } from "@/shared/ecs/version";
import { encodeVersionMap } from "@/shared/ecs/version";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { add, sub, unionAABB } from "@/shared/math/linear";
import type { AABB, Vec3 } from "@/shared/math/types";
import { reliableStream } from "@/shared/zrpc/reliable_stream";
import { makeWebSocketClient } from "@/shared/zrpc/websocket_client";
import { ok } from "assert";

export async function determineEmployeeUserId(): Promise<BiomesId> {
  const account = await getGCloudAccount();
  switch (account) {
    case "n@ill.inc":
      return 8521385202672319 as BiomesId; // Nick
    case "a@ill.inc":
      return 8521385202672316 as BiomesId; // akarpenko
    case "j@ill.inc":
      return 5518985451091968 as BiomesId; // Poincare
    case "b@ill.inc":
      // return 2516585699511638 as BiomesId; // mochimisu
      return 5518985451091977 as BiomesId; // Lagrange
    case "d@ill.inc":
      return 5518985451091962 as BiomesId; // TommyDee
    case "t@ill.inc":
      // return 2516585699511488 as BiomesId; // Taylor
      return 8521385202672217 as BiomesId; // Gauss
    case "top@ill.inc":
      return 5518985451091782 as BiomesId; // GroovyGravy
    case "i@ill.inc":
      return 8521385202672298 as BiomesId; // silberdollar
    case "devin@ill.inc":
      return 4911201062558487 as BiomesId; // Devin
  }
  throw new Error(`Unknown Employee Account: ${account}`);
}

export async function safeDetermineEmployeeUserId(): Promise<
  BiomesId | undefined
> {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  try {
    return await determineEmployeeUserId();
  } catch {
    // Ignore all errors.
  }
}

export async function createSyncClient(
  authUserId: BiomesId
): Promise<SyncClient> {
  const authSessionId = SessionStore.createInternalSyncSession(authUserId).id;
  const url =
    process.env.BIOMES_OVERRIDE_SYNC ?? "wss://play.biomes.gg/beta-sync";
  log.info("Connecting to sync server at: " + url);
  const client = makeWebSocketClient(zSyncService, url, {
    authUserId,
    authSessionId,
  });
  await client.waitForReady(Infinity);
  return client;
}

function determineBounds(changes: Map<BiomesId, Change>) {
  let aabb: AABB | undefined;
  for (const [, change] of changes) {
    if (
      change.kind === "delete" ||
      !change.entity.box ||
      !change.entity.shard_seed
    ) {
      continue;
    }
    const changeAABB = [change.entity.box.v0, change.entity.box.v1] as AABB;
    if (aabb === undefined) {
      aabb = changeAABB;
    } else {
      aabb = unionAABB(aabb, changeAABB);
    }
  }
  if (aabb !== undefined) {
    // Inset the bounding box a tiny bit.
    const offset: Vec3 = [1, 1, 1];
    aabb = [add(aabb[0], offset), sub(aabb[1], offset)];
  }
  return aabb;
}

function overrideToPosition(
  override: undefined | string | Vec3
): Vec3 | undefined {
  if (typeof override === "string") {
    const parts = override.split(",").map((x) => x.trim());
    ok(parts.length === 3);
    return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
  } else {
    return override;
  }
}

export class SyncBootstrap implements Bootstrap {
  async load(
    signal?: AbortSignal
  ): Promise<[changes: Change[], deliveries: Delivery[]]> {
    log.info(`SyncBootstrap connecting to prod.`);
    const employeeId = await determineEmployeeUserId();
    const client = await createSyncClient(employeeId);

    // Login-as support instead of the employee ID.
    const userId = process.env.BIOMES_OVERRIDE_AUTH
      ? parseBiomesId(process.env.BIOMES_OVERRIDE_AUTH)
      : employeeId;

    const deliveries: Delivery[] = [];
    const versionMap: VersionMap = new Map();
    const changeBuffer = new ChangeBuffer();
    let secondsSinceEpoch!: number;

    const radius = CONFIG.devBootstrapRadius;
    const center = overrideToPosition(CONFIG.devBootstrapPosition);

    log.info(
      `SyncBootstrap exporting world... ${radius} around ${center?.join(",")}`
    );
    for await (const delta of reliableStream(
      `dev-preload:${employeeId}`,
      (...args) => client.export(...args),
      async () => {
        return {
          versionMap: encodeVersionMap(versionMap),
          radius: radius,
          overrideUserId: userId,
          overridePosition: center,
        };
      },
      signal
    )) {
      if (delta.secondsSinceEpoch !== undefined) {
        secondsSinceEpoch = delta.secondsSinceEpoch;
      }
      if (delta.ecs !== undefined) {
        const changes = delta.ecs.map((c) => c?.change);
        for (const change of changes) {
          versionMap.set(changedBiomesId(change), change.tick);
        }
        changeBuffer.push(changes);
      }
      if (delta.chat !== undefined) {
        deliveries.push(...delta.chat);
      }
      if (delta.complete) {
        break;
      }
    }
    try {
      await client.close();
    } catch (error) {
      // Ignore all errors in closing.
    }

    ok(secondsSinceEpoch, "SyncBootstrap did not receive secondsSinceEpoch");
    ok(changeBuffer.size > 0, "SyncBootstrap did not receive any ECS state");

    // Determine updated world bounds based on the content we received.
    const bounds = determineBounds(changeBuffer.peekMap());
    if (bounds !== undefined) {
      log.warn("Using synthetic bounds", { bounds });
      const existing = changeBuffer.peekMap().get(WorldMetadataId);
      changeBuffer.push([
        {
          kind: "create",
          tick: existing?.tick ?? 1,
          entity: {
            id: WorldMetadataId,
            world_metadata: {
              aabb: {
                v0: bounds[0],
                v1: bounds[1],
              },
            },
          },
        },
      ]);
    }

    log.info(
      `SyncBootstrap successfully loaded with ${changeBuffer.size} changes, ${deliveries.length} deliveries`
    );
    return [changeBuffer.pop(), deliveries];
  }
}
