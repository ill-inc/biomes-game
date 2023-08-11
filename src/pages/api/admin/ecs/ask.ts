import { zScanAllRequest } from "@/server/ask/api";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zBiomesId } from "@/shared/ids";
import { idToNpcType } from "@/shared/npc/bikkie";
import { compactMap } from "@/shared/util/collections";
import { z } from "zod";

export const zAdminAskRequest = z.object({
  filter: zScanAllRequest,
  namedOnly: z.boolean().optional(),
});

export type AdminAskRequest = z.infer<typeof zAdminAskRequest>;

export const zNamedEntity = z.object({
  id: zBiomesId,
  name: z.string(),
});

export type NamedEntity = z.infer<typeof zNamedEntity>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zAdminAskRequest,
    response: zNamedEntity.array(),
  },
  async ({ context: { askApi }, body: { filter, namedOnly } }) => {
    const entities = await askApi.scanAll(filter);
    return compactMap(entities, (entity) => {
      const name =
        entity.label()?.text ??
        (entity.npcMetadata()?.type_id
          ? `${idToNpcType(entity.npcMetadata()!.type_id).displayName} ${
              entity.id
            }`
          : undefined) ??
        undefined;
      if (namedOnly && !name) {
        return undefined;
      }
      return {
        id: entity.id,
        name: name?.trim() || `b:${entity.id}`,
      };
    });
  }
);
