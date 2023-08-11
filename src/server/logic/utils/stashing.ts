import type { EventContext } from "@/server/logic/events/core";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { Iced } from "@/shared/ecs/gen/components";
import type { Delta } from "@/shared/ecs/gen/delta";
import type { Entity, ReadonlyEntity } from "@/shared/ecs/gen/entities";

import type { BiomesId } from "@/shared/ids";
import { ok } from "assert";
import { cloneDeep, pick } from "lodash";

export function stashEntity(
  entity: Delta,
  stashEntityId: BiomesId,
  context: EventContext<{}>,
  creatorId: BiomesId
) {
  const ts = secondsSinceEpoch();
  const toCreate: ReadonlyEntity = {
    ...cloneDeep(entity.asReadonlyEntity()),
    id: stashEntityId,
    icing: undefined,
    expires: undefined,
    iced: Iced.create(),
    stashed: {
      stashed_at: ts,
      stashed_by: creatorId,
      original_entity_id: entity.id,
    },
  };

  return context.create(toCreate);
}

export function unstashComponents(
  entity: Delta,
  stashEntity: ReadonlyEntity | undefined,
  context: { delete(id?: BiomesId): void },
  components: (keyof Entity)[]
) {
  ok(
    stashEntity?.stashed,
    "Tried to unstash from an entity that wasn't intended"
  );

  entity.copyFrom(pick(stashEntity, components));
  context.delete(stashEntity.id);
}
