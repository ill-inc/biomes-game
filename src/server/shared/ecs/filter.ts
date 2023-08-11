import type { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import type { LazyUpdate } from "@/server/shared/ecs/lazy";
import type { HfcComponentName } from "@/shared/ecs/gen/components";
import type { ComponentName } from "@/shared/ecs/gen/entities";
import type { DeepReadonly } from "@/shared/util/type_helpers";
import type { ZodType } from "zod";
import { z } from "zod";

// Note, when using EntityFilter on a subscription, you will receive
// all delete events, as the prior-state of the entity is not known.
export const zFilterComponentName = z.string() as ZodType<
  Exclude<ComponentName, HfcComponentName>
>;

export const zEntityFilter = z.object({
  // Entities *must* contain *any* of these components.
  anyOf: z.array(zFilterComponentName).optional(),
  // Entities *must not* contain *any* of these components.
  noneOf: z.array(zFilterComponentName).optional(),
});

export type EntityFilter = DeepReadonly<z.infer<typeof zEntityFilter>>;

export function passes(entity: LazyEntity, filter: EntityFilter) {
  return (
    (!filter.anyOf || filter.anyOf.some((r) => entity.has(r))) &&
    (!filter.noneOf || filter.noneOf.every((r) => !entity.has(r)))
  );
}

export function emptyFilter(filter?: EntityFilter): boolean {
  return (
    !filter || (!filter.anyOf && (!filter.noneOf || filter.noneOf.length === 0))
  );
}

export function couldAffectPassing(change: LazyUpdate, filter: EntityFilter) {
  return (
    (filter.anyOf && filter.anyOf.some((r) => change.entity.alters(r))) ||
    (filter.noneOf && filter.noneOf.every((r) => change.entity.alters(r)))
  );
}
