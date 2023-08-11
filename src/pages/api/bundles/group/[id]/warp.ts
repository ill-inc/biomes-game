import { zGroupById } from "@/pages/api/environment_group/[id]";
import { GameEvent } from "@/server/shared/api/game_event";
import {
  fetchEnvironmentGroupById,
  fetchGroupDetailBundle,
  fetchGroupOwner,
} from "@/server/web/db/environment_groups";
import { feedPostById, setWarpToDocument } from "@/server/web/db/social";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { WarpEvent } from "@/shared/ecs/gen/events";
import { calculateWarpFee, calculateWarpRoyalty } from "@/shared/game/costs";
import { toStoredEntityId } from "@/shared/ids";
import { zGroupDetailBundle } from "@/shared/types";
import { z } from "zod";

export const zGroupWarpResponse = z.object({
  group: zGroupDetailBundle,
});

export type GroupWarpResponse = z.infer<typeof zGroupWarpResponse>;

export default biomesApiHandler(
  {
    auth: "required",
    method: "POST",
    query: zGroupById,
    response: zGroupWarpResponse,
  },
  async ({
    context: { db, firehose, logicApi, worldApi, chatApi },
    auth: { userId },
    query: { id: groupId },
  }) => {
    const [group, groupEntity] = await Promise.all([
      fetchEnvironmentGroupById(db, groupId),
      worldApi.get(groupId),
    ]);
    okOrAPIError(
      group && groupEntity,
      "not_found",
      `Group ${groupId} doesn't exist in the DB`
    );
    const warpable = groupEntity.warpable();
    okOrAPIError(warpable, "gone", "Warp has expired");
    okOrAPIError(
      group.creationPostId,
      "not_found",
      "Group doesn't have a creation post"
    );
    const creationPost = await feedPostById(db, group.creationPostId);
    okOrAPIError(
      creationPost,
      "not_found",
      "Group creation post doesn't exist in the DB"
    );

    const player = await worldApi.get(userId);
    okOrAPIError(
      player && player.hasPosition(),
      "invalid_request",
      "No Player"
    );

    try {
      await setWarpToDocument(
        db,
        userId,
        db.collection("feed-posts").doc(toStoredEntityId(group.creationPostId))
      );
    } catch (error: any) {
      // already exists, ignore
      if (error?.code !== 6) {
        throw error;
      }
    }

    const { ownerBiomesUserId } = await fetchGroupOwner(db, group);

    const cost = calculateWarpFee(player.position().v, warpable.warp_to);

    const royalty = calculateWarpRoyalty(cost);

    await logicApi.publish(
      new GameEvent(
        userId,
        new WarpEvent({
          id: userId,
          position: [...warpable.warp_to],
          cost,
          royalty,
          royaltyTarget: ownerBiomesUserId,
        })
      )
    );

    const [groupBundle] = await Promise.all([
      fetchGroupDetailBundle(db, worldApi, groupId, {
        queryingUserId: userId,
      }),
      (async () => {
        if (
          ownerBiomesUserId &&
          (ownerBiomesUserId !== userId || CONFIG.allowPushForSelfActivity)
        ) {
          await chatApi.sendMessage({
            channel: "activity",
            to: ownerBiomesUserId,
            from: userId,
            message: {
              kind: "royalty",
              documentType: "post",
              documentId: groupId,
              royalty,
            },
          });
        }
      })(),
      firehose.publish({
        kind: "warp",
        entityId: userId,
      }),
    ]);
    okOrAPIError(groupBundle, "not_found", `Couldn't find info for ${groupId}`);

    return { group: groupBundle };
  }
);
