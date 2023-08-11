import { LazyEntity, LazyEntityDelta } from "@/server/shared/ecs/gen/lazy";
import { poisonedComponent } from "@/server/shared/ecs/lazy_base";
import { redisComponentDataToPackedComponent } from "@/server/shared/world/lua/serde";
import type { Change, Delete } from "@/shared/ecs/change";
import { changedBiomesId } from "@/shared/ecs/change";
import { COMPONENT_SERIALIZATION_MODE } from "@/shared/ecs/gen/components";
import type { SerializeTarget } from "@/shared/ecs/gen/json_serde";
import { KIND_TO_ID } from "@/shared/ecs/serde";
import type { WrappedChange } from "@/shared/ecs/zod";
import type { BiomesId } from "@/shared/ids";
import { assertNever } from "@/shared/util/type_helpers";

export interface LazyCreate {
  readonly kind: "create";
  readonly tick: number;
  readonly entity: LazyEntity;
}

export interface LazyUpdate {
  readonly kind: "update";
  readonly tick: number;
  readonly entity: LazyEntityDelta;
}

export type LazyChange = LazyCreate | LazyUpdate | Delete;

// Transform a lazy change directly into a value understood by ChangeSerde.deserialize
// Is useful when returning from server to client as it can avoid direct decoding
// of component data.
export function lazyChangeToSerialized(
  target: SerializeTarget,
  change: LazyChange
): WrappedChange {
  if (change.kind === "delete") {
    return [
      KIND_TO_ID["delete"],
      change.tick,
      change.id,
    ] as unknown as WrappedChange;
  }
  const allowDelta = change.kind === "update";
  const encoded: unknown[] = [change.entity.id];
  for (const [rawComponentId, value] of Object.entries(change.entity.encoded)) {
    if (value === poisonedComponent) {
      continue;
    }
    const componentId = parseInt(rawComponentId);
    const mode = COMPONENT_SERIALIZATION_MODE[componentId];
    if (mode === "server" && target.whoFor !== "server") {
      continue;
    } else if (
      mode === "self" &&
      target.whoFor === "client" &&
      target.id !== change.entity.id
    ) {
      continue;
    }
    const encodedComponent = redisComponentDataToPackedComponent(value);
    if (encodedComponent !== undefined && (allowDelta || encodedComponent)) {
      encoded.push(componentId, encodedComponent);
    }
  }
  return [
    KIND_TO_ID[change.kind],
    change.tick,
    encoded,
  ] as unknown as WrappedChange;
}

export function materializeLazyChange(change: LazyChange): Change {
  switch (change.kind) {
    case "delete":
      return change;
    case "update":
      return {
        kind: "update",
        tick: change.tick,
        entity: change.entity.materialize(),
      };
    case "create":
      return {
        kind: "create",
        tick: change.tick,
        entity: change.entity.materialize(),
      };
  }
}

export function makeLazyChange(change: Change): LazyChange {
  switch (change.kind) {
    case "delete":
      return change;
    case "update":
      return {
        kind: "update",
        tick: change.tick,
        entity: LazyEntityDelta.forDecoded(change.entity),
      };
    case "create":
      return {
        kind: "create",
        tick: change.tick,
        entity: LazyEntity.forDecoded(change.entity),
      };
  }
}

export function mergeLazyChange(
  prior: LazyChange | undefined,
  change: LazyChange
): LazyChange {
  if (prior === undefined) {
    return change;
  }
  if (prior.tick > change.tick) {
    return mergeLazyChange(change, prior);
  }
  switch (change.kind) {
    case "delete":
    case "create":
      return change;
    case "update":
      switch (prior.kind) {
        case "delete":
          return change;
        case "create":
          return {
            kind: "create",
            tick: Math.max(prior.tick, change.tick),
            entity: prior.entity.merge(change.entity),
          };
        case "update":
          return {
            kind: "update",
            tick: Math.max(prior.tick, change.tick),
            entity: prior.entity.merge(change.entity),
          };
      }
  }
}

export function applyLazyChange(
  entity: LazyEntity | undefined,
  change: LazyChange
): LazyEntity | undefined {
  switch (change.kind) {
    case "delete":
      return;
    case "update":
      return (entity ?? LazyEntity.empty(change.entity.id)).merge(
        change.entity
      );
    case "create":
      return change.entity;
    default:
      assertNever(change);
  }
}

export class LazyChangeBuffer {
  private data = new Map<BiomesId, LazyChange>();

  get size() {
    return this.data.size;
  }

  get empty() {
    return this.size === 0;
  }

  clear() {
    this.data.clear();
  }

  push(changes: LazyChange[]) {
    if (changes.length === 0) {
      return;
    }
    for (const change of changes) {
      const id = changedBiomesId(change);
      this.data.set(id, mergeLazyChange(this.data.get(id), change));
    }
  }

  pop(): LazyChange[] {
    const ret = Array.from(this.data.values());
    this.clear();
    return ret;
  }
}

export function stateToLazyChange(
  id: BiomesId,
  tick: number,
  entity?: LazyEntity
): LazyChange {
  if (entity) {
    return {
      kind: "create",
      tick,
      entity,
    };
  } else {
    return {
      kind: "delete",
      tick,
      id,
    };
  }
}
