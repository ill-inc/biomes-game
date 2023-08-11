import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { WrappedEntity, zEntity } from "@/shared/ecs/zod";
import { zBiomesId } from "@/shared/ids";

export default biomesApiHandler(
  {
    auth: "admin",
    body: zBiomesId.array(),
    response: zEntity.optional().array(),
    zrpc: true,
  },
  async ({ context: { worldApi }, body: ids }) =>
    (await worldApi.get(ids)).map((entity) =>
      WrappedEntity.for(entity?.materialize())
    )
);
