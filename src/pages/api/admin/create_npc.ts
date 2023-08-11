import { makeSpawnChangeToApply } from "@/server/spawn/spawn_npc";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { zBiomesId } from "@/shared/ids";
import { isNpcTypeId } from "@/shared/npc/bikkie";
import { ok } from "assert";
import { z } from "zod";

export const zCreateNpcRequest = z.object({
  userId: zBiomesId,
  typeId: zBiomesId,
  displayName: z.string(),
});

export type CreateNpcRequest = z.infer<typeof zCreateNpcRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zCreateNpcRequest,
    response: zBiomesId,
  },
  async ({
    context: { worldApi, idGenerator },
    body: { userId, typeId, displayName },
  }) => {
    ok(isNpcTypeId(typeId));

    const userEntity = await worldApi.get(userId);
    ok(userEntity?.has("position", "orientation"));

    const id = await idGenerator.next();
    await worldApi.apply(
      makeSpawnChangeToApply(secondsSinceEpoch(), {
        id,
        typeId,
        displayName,
        // Spawn an NPC exactly as the user is placed.
        position: [...userEntity.position().v],
        orientation: [0, userEntity.orientation()!.v[1]],
        wearing: userEntity.wearing(),
        appearance: userEntity.appearanceComponent(),
      })
    );
    return id;
  }
);
