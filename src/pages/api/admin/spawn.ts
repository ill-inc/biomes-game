import { makeSpawnChangeToApply } from "@/server/spawn/spawn_npc";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { zBiomesId } from "@/shared/ids";
import { add, scale, viewDir } from "@/shared/math/linear";
import { isNpcTypeId } from "@/shared/npc/bikkie";
import { ok } from "assert";
import { z } from "zod";

export const zSpawnRequest = z.object({
  userId: zBiomesId,
  typeId: zBiomesId,
});

export type SpawnRequest = z.infer<typeof zSpawnRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zSpawnRequest,
  },
  async ({ context: { worldApi, idGenerator }, body: { userId, typeId } }) => {
    ok(isNpcTypeId(typeId));

    const userEntity = await worldApi.get(userId);
    ok(userEntity?.has("position", "orientation"));

    await worldApi.apply(
      makeSpawnChangeToApply(secondsSinceEpoch(), {
        id: await idGenerator.next(),
        typeId,
        // Spawn the NPC slightly infront of the user.
        position: add(
          userEntity.position().v,
          scale(2, viewDir(userEntity.orientation().v))
        ),
        orientation: [0, userEntity.orientation()!.v[1] + Math.PI],
      })
    );
  }
);
