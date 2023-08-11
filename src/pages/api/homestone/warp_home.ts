import type { AskApi } from "@/server/ask/api";
import { GameEvent } from "@/server/shared/api/game_event";
import type { ServerMods } from "@/server/shared/minigames/server_mods";
import { resolveMinigameWarpPosition } from "@/server/shared/minigames/util";
import type { WorldApi } from "@/server/shared/world/api";
import type { FirestoreUser, WithId } from "@/server/web/db/types";
import { findByUID } from "@/server/web/db/users_fetch";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { WarpHomeEvent } from "@/shared/ecs/gen/events";
import { zVec3f, zWarpHomeReason } from "@/shared/ecs/gen/types";
import { WorldMetadataId } from "@/shared/ecs/ids";
import type { WarpHomeDestination } from "@/shared/firehose/events";
import { zWarpHomeDestination } from "@/shared/firehose/events";
import { boxToAabb } from "@/shared/game/group";
import { log } from "@/shared/logging";
import { add, containsAABB, scale } from "@/shared/math/linear";
import type {
  OptionallyOrientedPoint,
  ReadonlyAABB,
} from "@/shared/math/types";
import { zVec2f } from "@/shared/math/types";
import { yawVector } from "@/shared/physics/utils";
import { sample } from "lodash";
import { z } from "zod";

export const zWarpHomeResponse = z.object({
  warpPosition: zVec3f,
  warpOrientation: zVec2f.optional(),
});

export type WarpHomeResponse = z.infer<typeof zWarpHomeResponse>;

export const zWarpHomeRequest = z.object({
  destination: zWarpHomeDestination,
  reason: zWarpHomeReason,
});

export type WarpHomeRequest = z.infer<typeof zWarpHomeRequest>;

async function resolveWarpPosition(
  deps: {
    askApi: AskApi;
    worldApi: WorldApi;
    serverMods: ServerMods;
  },
  user: WithId<FirestoreUser>,
  destination: WarpHomeDestination
): Promise<OptionallyOrientedPoint> {
  const [worldMetadata, player] = await deps.worldApi.get([
    WorldMetadataId,
    user.id,
  ]);

  const aabb: ReadonlyAABB = worldMetadata?.worldMetadata()?.aabb
    ? boxToAabb(worldMetadata.worldMetadata()!.aabb)
    : [
        [0, 0, 0],
        [0, 0, 0],
      ];

  const [defaultPosition, defaultOrientation] = sample(
    CONFIG.warpDefaultPositions
  )!;

  switch (destination.kind) {
    case "starter_location":
      if (containsAABB(aabb, defaultPosition)) {
        return [[...defaultPosition], [...defaultOrientation]];
      }
      log.warn("Requested starter location warp outside the world.");
      break;
    case "minigame":
      const minigameId =
        destination.minigameId ?? player?.playingMinigame()?.minigame_id;
      if (minigameId === undefined) {
        log.warn(
          "Tried to warp to minigame location but not playing minigame!",
          {
            minigameId,
          }
        );
      } else {
        const pos = await resolveMinigameWarpPosition(
          deps,
          user.id,
          minigameId,
          player?.playingMinigame()?.minigame_instance_id
        );
        if (pos && containsAABB(aabb, pos[0])) {
          return pos;
        }
      }
      break;
    case "robot":
      const robot = await deps.worldApi.get(destination.robotId);
      if (robot) {
        const pos = robot.position()?.v;
        if (pos) {
          const yaw = robot.orientation()?.v[1] ?? 0;
          const offset = scale(2, yawVector(yaw));
          const offsetPos = add(pos, offset);
          if (containsAABB(aabb, offsetPos)) {
            return [[...offsetPos], [0, yaw + Math.PI]];
          }
        }
      }
      log.warn("Requested robot warp but no matching robot found.", {
        robotId: destination.robotId,
      });
      break;
  }

  if (CONFIG.devHomeOverride === "centerOfTerrain") {
    return [await deps.askApi.centerOfTerrain()];
  } else if (
    CONFIG.devHomeOverride !== undefined &&
    containsAABB(aabb, CONFIG.devHomeOverride)
  ) {
    return [CONFIG.devHomeOverride];
  } else if (user.homeLocation && containsAABB(aabb, user.homeLocation)) {
    return [user.homeLocation];
  }

  return [[...defaultPosition], [...defaultOrientation]];
}

export default biomesApiHandler(
  {
    auth: "required",
    method: "POST",
    body: zWarpHomeRequest,
    response: zWarpHomeResponse,
  },
  async ({
    context: { db, logicApi, firehose, askApi, serverMods, worldApi },
    auth: { userId },
    body: { destination, reason },
  }) => {
    const user = await findByUID(db, userId);
    okOrAPIError(user, "not_found");

    const [warpPosition, warpOrientation] = await resolveWarpPosition(
      { askApi, worldApi, serverMods },
      user,
      destination
    );

    await Promise.all([
      logicApi.publish(
        new GameEvent(
          userId,
          new WarpHomeEvent({
            id: userId,
            position: warpPosition,
            orientation: warpOrientation,
            reason,
          })
        )
      ),
      firehose.publish({
        kind: "warp",
        entityId: userId,
      }),
      firehose.publish({
        kind: "useHomestone",
        entityId: userId,
        destination,
      }),
    ]);
    return { warpPosition, warpOrientation };
  }
);
