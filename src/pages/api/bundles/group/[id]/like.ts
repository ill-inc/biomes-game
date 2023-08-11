import { zGroupById } from "@/pages/api/environment_group/[id]";
import { fetchGroupDetailBundle } from "@/server/web/db/environment_groups";
import { setLikeDocument } from "@/server/web/db/likes";
import { documentTypeToDocRef } from "@/server/web/db/social";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import type { LikeMessage } from "@/shared/chat/messages";
import type { ChannelName } from "@/shared/chat/types";
import { zBiomesId } from "@/shared/ids";
import { zGroupDetailBundle } from "@/shared/types";
import { z } from "zod";

export const zLikeResponse = z.object({
  group: zGroupDetailBundle,
});

export type LikeResponse = z.infer<typeof zLikeResponse>;

export const zLikeRequest = z.object({
  isLiked: z.boolean(),
  to: zBiomesId.optional(),
});

export type LikeRequest = z.infer<typeof zLikeRequest>;

export default biomesApiHandler(
  {
    auth: "required",
    body: zLikeRequest,
    query: zGroupById,
    response: zLikeResponse,
  },
  async ({
    context: { db, worldApi, chatApi },
    auth: { userId },
    query: { id: groupId },
    body: { isLiked, to },
  }) => {
    const creationPostRef = await documentTypeToDocRef(
      db,
      "environment_group",
      groupId
    );
    okOrAPIError(creationPostRef, "not_found");

    try {
      await setLikeDocument(db, userId, creationPostRef, isLiked);
    } catch (error: any) {
      // already exists, ignore
      if (error?.code !== 6) {
        throw error;
      }
    }

    // Send notifications
    if (to) {
      const message = {
        channel: "activity" as ChannelName,
        to: to,
        sender: { id: userId },
        message: <LikeMessage>{
          kind: "like",
          documentType: "environment_group",
          documentId: groupId,
        },
      };

      if (isLiked) {
        await chatApi.sendMessage(message);
      } else {
        await chatApi.unsendMessage(message);
      }
    }

    const groupBundle = await fetchGroupDetailBundle(db, worldApi, groupId, {
      queryingUserId: userId,
    });
    okOrAPIError(groupBundle, "not_found", `Couldn't find info for ${groupId}`);
    return { group: groupBundle };
  }
);
