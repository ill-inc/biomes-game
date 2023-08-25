import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { WrappedEntity, zEntity } from "@/shared/ecs/zod";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zAdminEntityGetRequest = zBiomesId.array();
export type AdminEntityGetRequest = z.infer<typeof zAdminEntityGetRequest>;

export const zAdminEntityGetResponse = z.array(zEntity.optional());
export type AdminEntityGetResponse = z.infer<typeof zAdminEntityGetResponse>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zAdminEntityGetRequest,
    response: zAdminEntityGetResponse,
    zrpc: true,
  },
  async ({ context: { worldApi }, body: ids }) =>
    (await worldApi.get(ids)).map((entity) =>
      WrappedEntity.for(entity?.materialize())
    )
);
