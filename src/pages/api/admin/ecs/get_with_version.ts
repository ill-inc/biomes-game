import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { WrappedEntity, zEntity } from "@/shared/ecs/zod";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zGetWithVersionResponse = z.array(
  z.tuple([z.number(), zEntity.optional()])
);

export default biomesApiHandler(
  {
    auth: "admin",
    body: zBiomesId.array(),
    response: zGetWithVersionResponse,
    zrpc: true,
  },
  async ({ context: { worldApi }, body: ids }) =>
    (await worldApi.getWithVersion(ids)).map(
      ([version, entity]) =>
        [version, WrappedEntity.for(entity?.materialize())] as [
          number,
          WrappedEntity
        ]
    )
);
