import { getNpcSize } from "@/server/spawn/spawn_npc";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import type { ChangeToApply } from "@/shared/api/transaction";
import type { NpcMetadata } from "@/shared/ecs/gen/components";
import { Orientation, Position, Size } from "@/shared/ecs/gen/components";
import { zBiomesId } from "@/shared/ids";
import { idToNpcType, isNpcTypeId } from "@/shared/npc/bikkie";
import { ok } from "assert";
import { cloneDeep } from "lodash";
import { z } from "zod";

export const zPlaceNpcRequest = z.object({
  userId: zBiomesId,
  npcId: zBiomesId,
});

export type PlaceNpcRequest = z.infer<typeof zPlaceNpcRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zPlaceNpcRequest,
  },
  async ({ context: { worldApi }, body: { userId, npcId } }) => {
    const [userEntity, npcEntity] = await worldApi.get([userId, npcId]);
    ok(userEntity?.has("position", "orientation"));

    const typeId = npcEntity?.npcMetadata()?.type_id;
    ok(typeId && isNpcTypeId(typeId));
    const npcType = idToNpcType(typeId);

    const updateMetadata = cloneDeep(npcEntity.npcMetadata()!) as NpcMetadata;
    updateMetadata.spawn_position = [...userEntity.position().v];
    updateMetadata.spawn_orientation = [0, userEntity.orientation().v[1]];

    await worldApi.apply(<ChangeToApply>{
      changes: [
        {
          kind: "update",
          entity: {
            id: npcId,
            position: Position.create({ v: [...userEntity.position().v] }),
            orientation: Orientation.create({
              v: [0, userEntity.orientation()!.v[1]],
            }),
            npc_metadata: updateMetadata,
            size: Size.create({ v: getNpcSize(npcType) }),
            iced: null,
          },
        },
      ],
    });
  }
);
