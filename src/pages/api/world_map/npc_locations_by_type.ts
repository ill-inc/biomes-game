import {
  biomesApiHandler,
  zQueryBiomesId,
} from "@/server/web/util/api_middleware";
import { zVec3f } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import type { Vec3 } from "@/shared/math/types";
import { z } from "zod";

export const zNPCLocationsByTypeResponse = z.object({
  npcLocations: z.tuple([zBiomesId, zVec3f]).array(),
});

export type NPCLocationsByTypeResponse = z.infer<
  typeof zNPCLocationsByTypeResponse
>;

export default biomesApiHandler(
  {
    auth: "required",
    query: z.object({
      typeId: zQueryBiomesId,
    }),
    response: zNPCLocationsByTypeResponse,
  },
  async ({ context: { askApi, serverCache }, query: { typeId } }) => {
    const entityLocs = await serverCache.getOrCompute(
      1 * 60,
      "npcTypeLocations",
      typeId,
      async () => {
        const ret: Array<[BiomesId, Vec3]> = [];
        const npcsByType = await askApi.getByKeys({
          kind: "npcsByType",
          typeId,
        });
        for (const npc of npcsByType) {
          if (npc.hasPosition()) {
            ret.push([npc.id, [...npc.position().v]]);
          }
        }
        return ret;
      }
    );
    return {
      npcLocations: entityLocs ?? [],
    };
  }
);
