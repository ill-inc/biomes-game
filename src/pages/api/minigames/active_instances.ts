import type { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { WrappedEntityFor, zEntity } from "@/shared/ecs/zod";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zActiveInstancesRequest = z.object({
  minigameId: zBiomesId,
});

export type ActiveInstancesRequest = z.infer<typeof zActiveInstancesRequest>;

export const zActiveInstancesResponse = z.array(zEntity);

export type ActiveInstancesResponse = z.infer<typeof zActiveInstancesResponse>;

function validInstance(entity: LazyEntity) {
  const minigameInstance = entity.minigameInstance();
  if (!minigameInstance || minigameInstance?.finished) {
    return false;
  }

  if (
    minigameInstance.state.kind === "deathmatch" &&
    minigameInstance.state.instance_state === undefined
  ) {
    return false;
  }

  if (entity.hasIced()) {
    return false;
  }
}

export default biomesApiHandler(
  {
    auth: "required",
    body: zActiveInstancesRequest,
    response: zActiveInstancesResponse,
    zrpc: true,
  },
  async ({ auth: { userId }, context: { askApi }, body: { minigameId } }) => {
    const instances = await askApi.getByKeys({
      kind: "minigameInstancesByMinigameId",
      minigameId: minigameId,
    });

    const activeInstances = instances.filter(validInstance);

    return activeInstances.map(
      (e) =>
        new WrappedEntityFor({ whoFor: "client", id: userId }, e.materialize())
    );
  }
);
