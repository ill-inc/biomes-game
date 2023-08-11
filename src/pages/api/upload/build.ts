import { GameEvent } from "@/server/shared/api/game_event";
import {
  createEnvironmentGroupInDB,
  environmentGroupsByCreator,
  fetchGroupDetailBundle,
} from "@/server/web/db/environment_groups";
import type { FirestoreEnvironmentGroup } from "@/server/web/db/types";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { usingAsync } from "@/shared/deletable";
import { CreateGroupEvent } from "@/shared/ecs/gen/events";
import { zBiomesIdList, zBox2, zVec2f, zVec3f } from "@/shared/ecs/gen/types";
import { toStoredEntityId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { zGroupDetailBundle } from "@/shared/types";
import {
  asyncBackoffUntil,
  defaultBackoffConfig,
} from "@/shared/util/retry_helpers";
import { groupTensorValueCounts } from "@/shared/util/voxels";
import { compact } from "lodash";
import { z } from "zod";

export const zCreateEnvironmentGroupRequest = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  allowWarping: z.boolean(),
  warpPosition: zVec3f,
  warpOrientation: zVec2f,
  imageBlobB64: z.string(),
  gltfBlob: z.string(),
  tensor: z.string(),
  box: zBox2,
  placeableIds: zBiomesIdList,
  position: zVec3f,
});

export type CreateEnvironmentGroupRequest = z.infer<
  typeof zCreateEnvironmentGroupRequest
>;

export default biomesApiHandler(
  {
    auth: "required",
    body: zCreateEnvironmentGroupRequest,
    response: zGroupDetailBundle,
  },
  async ({
    context: { db, worldApi, logicApi, idGenerator, voxeloo },
    auth: { userId },
    body: {
      name,
      description,
      allowWarping,
      warpPosition,
      warpOrientation,
      imageBlobB64,
      gltfBlob,
      tensor,
      box,
      placeableIds,
      position,
    },
  }) => {
    const groupId = await idGenerator.next();
    // Add group to the DB

    const pngBlob = Buffer.from(imageBlobB64, "base64");
    log.info("Creating DB environment group");
    const dbRet = await usingAsync(
      new voxeloo.GroupTensor(),
      async (decodedTensor) => {
        decodedTensor.load(tensor);
        return createEnvironmentGroupInDB(
          db,
          idGenerator,
          groupId,
          userId,
          gltfBlob,
          pngBlob,
          allowWarping,
          {
            name,
            terrainCounts: groupTensorValueCounts(decodedTensor),
            description: description,
          }
        );
      }
    );

    // Add group to the ECS.

    await logicApi.publish(
      new GameEvent(
        userId,
        new CreateGroupEvent({
          id: groupId,
          user_id: userId,
          box,
          tensor,
          placeable_ids: placeableIds,
          position,
          name,
          warp: allowWarping
            ? {
                warp_to: warpPosition,
                orientation: warpOrientation,
              }
            : undefined,
        })
      )
    );

    // Verify that the group has been created

    const expireAtMs = Date.now() + 1000 * 60;
    await asyncBackoffUntil(
      async () => {
        const unconfirmedGroups = await environmentGroupsByCreator(
          db,
          userId,
          "unconfirmed"
        );
        const ecsGroups = compact(
          await Promise.all(
            unconfirmedGroups.map((group) =>
              // GI-2581 Evaluate strongGetEntity
              worldApi.get(group.id)
            )
          )
        );
        const ecsGroupIds = ecsGroups.map((g) => g.id);
        await Promise.all(
          ecsGroups.map((g) => {
            const updates: Partial<FirestoreEnvironmentGroup> = {
              state: "confirmed",
            };
            return db
              .collection("environment-groups")
              .doc(toStoredEntityId(g.id))
              .update(updates);
          })
        );
        const failedGroups = unconfirmedGroups.filter(
          (g) => (g.createMs ?? 0) > expireAtMs && !ecsGroupIds.includes(g.id)
        );
        await Promise.all(
          failedGroups.map((g) => {
            const updates: Partial<FirestoreEnvironmentGroup> = {
              state: "failed",
            };
            return db
              .collection("environment-groups")
              .doc(toStoredEntityId(g.id))
              .update(updates);
          })
        );
        return ecsGroupIds;
      },
      (ecsGroupIds) => ecsGroupIds.includes(groupId),
      {
        ...defaultBackoffConfig(),
        infoString: `waiting for group to be written to the ECS`,
      }
    );

    const [groupBundle] = await Promise.all([
      fetchGroupDetailBundle(db, worldApi, dbRet.id, {
        knownOwnerId: dbRet.creatorId,
        queryingUserId: userId,
      }),
    ]);

    okOrAPIError(
      groupBundle,
      "not_found",
      `Couldn't find info for ${dbRet.id}`
    );
    return groupBundle;
  }
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "64mb",
    },
  },
};
