import type { ChangeSet } from "@/server/logic/events/context/change_set";
import type {
  AclChecker,
  DefinedKeys,
  EventContext,
  InvolvedEntities,
  InvolvedSpecification,
} from "@/server/logic/events/core";

import { AclCheckDomain, NewId, NewIds } from "@/server/logic/events/core";
import type { QueriedEntityWith } from "@/server/logic/events/query";
import { determineIds } from "@/server/logic/events/query";
import { Specialized } from "@/server/logic/events/specialized";
import { eachResultOf } from "@/server/logic/events/util";
import { Delta, DeltaPatch, PatchableEntity } from "@/shared/ecs/gen/delta";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { FirehoseEvent } from "@/shared/firehose/events";
import { Terrain } from "@/shared/game/terrain/terrain";
import type { BiomesId } from "@/shared/ids";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";
import { isArray, mapValues } from "lodash";

export class InternalEventContext<
  TEvent,
  TInvolvedSpecification extends InvolvedSpecification
> implements EventContext<TInvolvedSpecification>
{
  private readonly terrain: Terrain[] = [];
  private readonly entities: (Specialized | DeltaPatch)[] = [];
  private readonly events: FirehoseEvent[] = [];
  private deleted: Set<BiomesId> | undefined;

  constructor(
    public readonly voxeloo: VoxelooModule,
    public readonly involved: TInvolvedSpecification,
    public readonly results: InvolvedEntities<TInvolvedSpecification>,
    private created: Map<BiomesId, PatchableEntity | undefined> | undefined
  ) {
    for (const entry of eachResultOf(results)) {
      if (entry instanceof Terrain) {
        this.terrain.push(entry);
      } else if (entry instanceof DeltaPatch || entry instanceof Specialized) {
        this.entities.push(entry);
      }
    }
  }

  publish(event: FirehoseEvent) {
    this.events.push(event);
  }

  private checkCanCreate(id: BiomesId) {
    ok(this.created !== undefined, "No entities available to create.");
    ok(this.created.has(id), "Entity ID not specified in query plan.");
    ok(this.created.get(id) === undefined, "Entity already created");
  }

  create<TEntity extends ReadonlyEntity>(entity: TEntity) {
    this.checkCanCreate(entity.id);
    const builder = new PatchableEntity({ id: entity.id });
    builder.copyFrom(entity);
    if (this.created === undefined) {
      this.created = new Map();
    }
    this.created.set(entity.id, builder);
    return builder as unknown as QueriedEntityWith<DefinedKeys<TEntity>>;
  }

  private checkCanDelete(id: BiomesId) {
    ok(
      this.created === undefined || !this.created.has(id),
      "Cannot delete newly created enities."
    );

    ok(
      this.deleted === undefined || !this.deleted.has(id),
      "Cannot delete twice."
    );
    for (const value of eachResultOf(this.results)) {
      if (value === undefined) {
        continue;
      }
      if (value instanceof Delta || value instanceof Specialized) {
        if (value.id === id) {
          return;
        }
        continue;
      }
      if (value instanceof Terrain) {
        ok(value.id !== id, "Cannot delete terrain.");
        continue;
      }
      if (typeof value === "number" || typeof value === "string") {
        ok(value !== id, "Cannot delete ShardIds.");
        continue;
      }
      if ((value as ReadonlyEntity).id === id) {
        return;
      }
    }
    throw new Error("Cannot delete entity not in query plan.");
  }

  delete(id?: BiomesId) {
    if (id === undefined) {
      return;
    }
    this.checkCanDelete(id);
    if (this.deleted === undefined) {
      this.deleted = new Set();
    }
    this.deleted.add(id);
  }

  abandon() {
    for (const terrain of this.terrain) {
      terrain.abandon();
    }

    // Note: Entities do not need abandon, just don't commit
    // them and the changes are lost.
  }

  commit(changeSet: ChangeSet<TEvent>) {
    // Actual updates are handled by the change set itself, we
    // don't need to handle them here.
    for (const terrain of this.terrain) {
      terrain.commit();
    }

    for (const entity of this.entities) {
      if (entity instanceof DeltaPatch) {
        entity.commit();
      } else {
        const events = entity.commit();
        if (events) {
          this.events.push(...events);
        }
      }
    }

    // Propagate any creates, deletes and event publishes.
    for (const created of this.created?.values() ?? []) {
      if (created !== undefined) {
        changeSet.create(created);
      }
    }

    for (const deleted of this.deleted ?? []) {
      changeSet.delete(deleted);
    }

    changeSet.publish(this.events);
  }

  dump() {
    return {
      involved: mapValues(this.involved, (value) => {
        if (value instanceof NewId) {
          return "[new-id]";
        }
        if (value instanceof NewIds) {
          return `[new-id x${value.count}]`;
        }
        if (value instanceof AclCheckDomain) {
          return `[protection-check-domain ${JSON.stringify(value.domain)}]`;
        }
        const ids = [...determineIds(value)];
        return ids.length === 1 ? ids[0] : ids;
      }),
      results: mapValues(this.results, (value) => {
        if (value === undefined) {
          return "[missing]";
        } else if (typeof value === "number" || typeof value === "string") {
          return value;
        } else if (isArray(value)) {
          return value.map((v) =>
            typeof v === "number" || typeof v === "string" ? v : v.id
          );
        } else if (isAclChecker(value)) {
          return "[AclChecker]";
        } else {
          return value.id;
        }
      }),
    };
  }
}

// Silly necessary helper function needed until TS 5.0 (https://github.com/microsoft/TypeScript/pull/51502)
function isAclChecker(value: unknown): value is AclChecker {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "aclChecker"
  );
}
