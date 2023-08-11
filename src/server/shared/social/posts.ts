import { GameEvent } from "@/server/shared/api/game_event";
import type { LogicApi } from "@/server/shared/api/logic";
import type { IdGenerator } from "@/server/shared/ids/generator";
import type { BDB } from "@/server/shared/storage";
import type { FirestoreFeedPost, WithId } from "@/server/web/db/types";
import { CreatePhotoPortalEvent } from "@/shared/ecs/gen/events";
import type { Vec2f, Vec3f } from "@/shared/ecs/gen/types";
import { toStoredEntityId } from "@/shared/ids";

export async function makePhotoWarpable(
  db: BDB,
  idGenerator: IdGenerator,
  logicApi: LogicApi,
  post: WithId<FirestoreFeedPost>,
  position: Vec3f,
  orientation: Vec2f
) {
  const photoPortalId = await idGenerator.next();

  // Idempotent due to deterministic photo portal id
  await logicApi.publish(
    new GameEvent(
      photoPortalId,
      new CreatePhotoPortalEvent({
        id: photoPortalId,
        photo_id: post.id,
        photo_author_id: post.userId,
        position,
        orientation,
      })
    )
  );
  await db.collection("feed-posts").doc(toStoredEntityId(post.id)).update({
    portalEntityId: photoPortalId,
  });
}
