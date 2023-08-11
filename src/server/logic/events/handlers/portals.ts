import { makeEventHandler } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import { secondsSinceEpoch } from "@/shared/ecs/config";

export const createPhotoPortalEventHandler = makeEventHandler(
  "createPhotoPortalEvent",
  {
    mergeKey: (event) => event.photo_author_id,
    involves: (event) => ({
      author: event.photo_author_id,
      portal: q.id(event.id).optional(),
    }),
    apply: ({ portal }, event, context) => {
      if (portal !== undefined) {
        throw new Error(
          "Received create photo portal event but warpable entity already exists"
        );
      }

      context.create({
        id: event.id,
        position: {
          v: event.position,
        },
        warpable: {
          trigger_at: secondsSinceEpoch() + 24 * 3600,
          warp_to: event.position,
          orientation: event.orientation,
          owner: event.photo_author_id,
        },
        expires: {
          trigger_at: secondsSinceEpoch() + 24 * 3600,
        },
      });
    },
  }
);
