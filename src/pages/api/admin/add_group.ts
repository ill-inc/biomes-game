import { GameEvent } from "@/server/shared/api/game_event";
import type { FirestoreEnvironmentGroup } from "@/server/web/db/types";
import { findByUID } from "@/server/web/db/users_fetch";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { usingAsync } from "@/shared/deletable";
import { AdminGiveItemEvent } from "@/shared/ecs/gen/events";
import type { ItemBag } from "@/shared/ecs/gen/types";
import { groupItem } from "@/shared/game/group";
import { addToBag, countOf } from "@/shared/game/items";
import { toStoredEntityId, zBiomesId } from "@/shared/ids";
import { zEnvironmentGroupBundle } from "@/shared/types";
import { groupTensorValueCounts } from "@/shared/util/voxels";
import { mapValues } from "lodash";
import { z } from "zod";

export const zAddGroupRequest = z.object({
  userId: zBiomesId,
  group: zEnvironmentGroupBundle,
});

export type AddGroupRequest = z.infer<typeof zAddGroupRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zAddGroupRequest,
  },
  async ({
    context: { db, logicApi, idGenerator, voxeloo },
    body: { userId, group: groupBundle },
  }) => {
    const user = await findByUID(db, userId);
    okOrAPIError(user, "not_found");

    const groupId = await idGenerator.next();
    okOrAPIError(groupBundle.tensor, "bad_param");
    okOrAPIError(groupBundle.name, "bad_param");

    await usingAsync(new voxeloo.GroupTensor(), async (tensor) => {
      tensor.load(groupBundle.tensor!);
      const terrainCounts = groupTensorValueCounts(tensor);
      const gltfURL = new URL(groupBundle.gltfURL ?? "");
      const imagePaths = mapValues(groupBundle.imageUrls, (val) => {
        return val ? new URL(val).pathname : undefined;
      });
      const timestamp = Date.now();

      const toAdd: FirestoreEnvironmentGroup = {
        creatorId: userId,
        createMs: timestamp,
        deleted: false,
        state: "confirmed",
        name: groupBundle.name,
        materialIndexes: Array.from(terrainCounts.keys()),
        materialCounts: Array.from(terrainCounts.values()),
        cloudBucket: "biomes-static",
        cloudGLTFPath: gltfURL.pathname,
        cloudImageLocations: imagePaths,
      };
      await db
        .collection("environment-groups")
        .doc(toStoredEntityId(groupId))
        .create(toAdd);
    });

    const bag: ItemBag = new Map();
    addToBag(bag, countOf(groupItem(groupId)));
    await logicApi.publish(
      new GameEvent(userId, new AdminGiveItemEvent({ id: userId, bag }))
    );
  }
);
