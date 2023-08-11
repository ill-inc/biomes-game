import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zComponentName } from "@/shared/ecs/gen/entities";
import { EntitySerde, SerializeForServer } from "@/shared/ecs/gen/json_serde";
import { zBiomesId } from "@/shared/ids";
import { pick } from "lodash";
import { z } from "zod";

export const zEntityBatchRequest = z.object({
  ids: z.array(zBiomesId).min(1).max(200),
  components: zComponentName.array().optional(),
});

export type EntityBatchRequest = z.infer<typeof zEntityBatchRequest>;

export const zEntityBatchResponse = z.object({
  entities: z.array(z.any()), // Serialized Entity.
});

export type EntityBatchResponse = z.infer<typeof zEntityBatchResponse>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zEntityBatchRequest,
    response: zEntityBatchResponse,
  },
  async ({ context: { worldApi }, body: { ids, components } }) => {
    const entities = await worldApi.get(ids);
    okOrAPIError(entities.length === ids.length, "not_found");

    const results: any[] = [];
    for (const entity of entities) {
      if (!entity) {
        continue;
      }
      if (components !== undefined) {
        if (!entity.has(...components)) {
          continue;
        }
        results.push(
          EntitySerde.serialize(
            SerializeForServer,
            pick(entity.materialize(), "id", ...components)
          )
        );
      } else {
        results.push(
          EntitySerde.serialize(SerializeForServer, entity.materialize())
        );
      }
    }
    okOrAPIError(results.length === ids.length, "not_found");
    return {
      entities: results,
    };
  }
);
