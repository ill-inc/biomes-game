import type { FinalizedChangeSet } from "@/server/logic/events/context/change_set";
import { ChangeSet } from "@/server/logic/events/context/change_set";
import { ChangeSetForest } from "@/server/logic/events/context/change_set_forest";
import { InternalEventContext } from "@/server/logic/events/context/context";
import type { LogicVersionedEntitySource } from "@/server/logic/events/context/versioned_entity_source";
import type {
  AclCheckDomain,
  AclChecker,
  AnyEventHandler,
  EventHandler,
  IndexResolver,
  InvolvedEntities,
  InvolvedSpecification,
  PreparedEntities,
  PrepareSpecification,
} from "@/server/logic/events/core";
import {
  countNewIds,
  determineIdsUsed,
  RollbackError,
} from "@/server/logic/events/core";
import type { WorkByHandler } from "@/server/logic/events/grouping";
import type { AnyQuery, EntitySource } from "@/server/logic/events/query";
import {
  ByKey,
  determineIds,
  MissingOk,
  satisfyQuery,
  satisfyReadonlyQuery,
} from "@/server/logic/events/query";
import {
  isTerrainRestoring,
  restorationDelay,
} from "@/server/logic/utils/restoration";
import type { IdPoolLoan } from "@/server/shared/ids/pool";
import type { SpecialRoles } from "@/shared/acl_types";
import type { ReadonlyDelta } from "@/shared/ecs/gen/delta";
import type { EventSet } from "@/shared/ecs/gen/events";
import type { AclAction } from "@/shared/ecs/gen/types";
import {
  aclForEntity,
  aclsForEntities,
  actionAllowed,
  involvedShardsForAclDomain,
  itemActionAllowed,
  narrowAclEntities,
  pointsByShardForAclDomain,
} from "@/shared/game/acls";
import {
  ALLOWED_TEMPORARY_BLOCK_ACTIONS,
  prioritizeRestorationEntities,
} from "@/shared/game/restoration";
import { shardDecode } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { isBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { createCounter } from "@/shared/metrics/metrics";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";
import { entriesIn } from "lodash";

const eventCounter = createCounter({
  name: "game_events",
  help: "Game events",
  labelNames: ["kind"],
});

export type Todo<TEvent> = [AnyEventHandler, [TEvent, InvolvedSpecification][]];

export function idsInTodo<TEvent>(
  resolver: IndexResolver,
  todo: Todo<TEvent>[]
) {
  const ids: BiomesId[] = [];
  for (const [, events] of todo) {
    for (const [, spec] of events) {
      ids.push(...determineIdsUsed(resolver, spec));
    }
  }
  return ids;
}

// Operations available when processing a batch of events.
export class EventBatchContext<TEvent> implements IndexResolver {
  private readonly availableIds: BiomesId[] = [];
  private readonly forest = new ChangeSetForest<TEvent>();

  // Source for all entity data, also holds the terrain shards used by any
  // changeset in this batch to ensure they get the same value.
  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly versionedEntitySource: LogicVersionedEntitySource,
    public readonly secondsSinceEpoch: number
  ) {}

  resolveIndexLookup(id: ByKey<any>): BiomesId | undefined {
    return this.versionedEntitySource.resolveIndexLookup(id);
  }

  provideIds(ids: ReadonlyArray<BiomesId>) {
    this.availableIds.push(...ids);
  }

  id(): BiomesId {
    ok(this.availableIds.length > 0, "ID underflow");
    return this.availableIds.pop()!;
  }

  ids(count: number): BiomesId[] {
    ok(this.availableIds.length >= count, "ID underflow");
    return this.availableIds.splice(0, count);
  }

  // Satisfy all the queries in the given specification.
  private prepareSatisfy<TPrepareSpec extends PrepareSpecification>(
    involved: TPrepareSpec,
    handler: AnyEventHandler
  ): PreparedEntities<TPrepareSpec> | undefined {
    const result: PreparedEntities<PrepareSpecification> = {};
    for (const [key, value] of entriesIn(involved)) {
      if (value === undefined) {
        continue;
      }
      let match = satisfyReadonlyQuery(
        this.versionedEntitySource.asReadonly(),
        value
      );
      if (match instanceof MissingOk) {
        match = undefined;
      } else if (match === undefined) {
        if (process.env.NODE_ENV !== "production") {
          log.warn("Prepare -- Could not satisfy query for entity", {
            kind: handler.kind,
            key,
            value,
          });
        }
        return;
      }
      result[key] = match;
    }
    return result as PreparedEntities<TPrepareSpec>;
  }

  prepare<
    TPrepareSpec extends PrepareSpecification,
    TPrepared,
    TInvolvedSpec extends InvolvedSpecification
  >(
    handler: EventHandler<TEvent, TInvolvedSpec, TPrepareSpec, TPrepared>,
    event: TEvent
  ): [TEvent, TInvolvedSpec] | undefined {
    try {
      let results: TPrepared | undefined;
      if (handler.prepare !== undefined) {
        const involved =
          handler.prepareInvolves === undefined
            ? ({} as any)
            : handler.prepareInvolves(event);
        const prepared = this.prepareSatisfy<TPrepareSpec>(involved, handler);
        if (prepared === undefined) {
          return;
        }
        results = handler.prepare(prepared, event, { voxeloo: this.voxeloo });
        if (results === undefined) {
          return;
        }
      }
      const involved = handler.involves(event, results as TPrepared);
      if (involved === undefined) {
        return;
      }
      return [event, involved];
    } catch (error: any) {
      (error instanceof RollbackError ? log.warn : log.error)(
        `Error in prepare`,
        {
          kind: handler.kind,
          error,
        }
      );
    }
  }

  // Satisfy all the queries in the given specification.
  private satisfy<TInvolvedSpecification extends InvolvedSpecification>(
    entitySource: EntitySource,
    involved: TInvolvedSpecification
  ): [
    InvolvedEntities<TInvolvedSpecification> | undefined,
    Map<BiomesId, undefined> | undefined
  ] {
    const result: any = {};
    let created: Map<BiomesId, undefined> | undefined;

    const markCreated = (idOrQuery: BiomesId | AnyQuery) => {
      if (created === undefined) {
        created = new Map();
      }
      if (!isBiomesId(idOrQuery)) {
        for (const id of determineIds(idOrQuery)) {
          if (isBiomesId(id)) {
            created.set(id, undefined);
          }
        }
        return;
      }
      created.set(idOrQuery, undefined);
    };

    for (const [key, value] of entriesIn(involved)) {
      if (value === undefined) {
        continue;
      }
      if (!isBiomesId(value)) {
        switch (value.kind) {
          case "newId":
            {
              const id = this.id();
              result[key] = id;
              markCreated(id);
            }
            continue;
          case "newIds":
            {
              const ids = this.ids(value.count);
              result[key] = ids;
              for (const id of ids) {
                markCreated(id);
              }
            }
            continue;
          case "aclCheckDomain":
            {
              result[key] = this.makeAclChecker(value);
            }
            continue;
        }
      }
      let match = satisfyQuery(entitySource, value);
      if (match instanceof MissingOk) {
        match = undefined;
        markCreated(value);
      } else if (match === undefined) {
        if (process.env.NODE_ENV !== "production") {
          log.warn("Could not satisfy query for entity", {
            key,
            value,
          });
        }
        return [undefined, undefined];
      }
      result[key] = match;
    }
    return [result, created];
  }

  apply<TInvolvedSpecification extends InvolvedSpecification>(
    handler: EventHandler<TEvent, TInvolvedSpecification, any, any>,
    event: TEvent,
    involved: TInvolvedSpecification
  ) {
    const changeSet = new ChangeSet<TEvent>(this.versionedEntitySource);
    const [results, created] = (() => {
      try {
        return this.satisfy(changeSet, involved);
      } catch (error: any) {
        log.error(`Error in satisfying`, { error, event });
        return [undefined, undefined];
      }
    })();
    if (results === undefined) {
      return;
    }
    this.forest.add(changeSet);

    const context = new InternalEventContext(
      this.voxeloo,
      involved,
      results,
      created
    );
    try {
      handler.apply(context.results, event, context);
      context.commit(changeSet);
      changeSet.markHandled(event);
    } catch (error: any) {
      context.abandon();
      (error instanceof RollbackError ? log.warn : log.error)(
        `Error in apply`,
        {
          event,
          error,
          context: context.dump(),
        }
      );
    }
  }

  build(): FinalizedChangeSet<TEvent>[] {
    const results = this.forest.build();
    this.availableIds.length = 0;
    return results;
  }

  // Note: This takes ownership of the event.s
  prepareAll(
    handlerWorkByKind: Map<keyof EventSet, WorkByHandler>
  ): [Todo<TEvent>[], number] {
    let count = 0;
    const todo: Todo<TEvent>[] = [];
    for (const [handler, work] of handlerWorkByKind.values()) {
      const handlerTodo: [TEvent, InvolvedSpecification][] = [];
      for (const event of work) {
        const ready = this.prepare(handler, event as TEvent);
        if (ready !== undefined) {
          handlerTodo.push(ready);
        }
      }
      if (handlerTodo.length > 0) {
        todo.push([handler, handlerTodo]);
      }
      count += work.length;
    }
    return [todo, count];
  }

  async processEvents(
    idLoan: IdPoolLoan,
    todo: Todo<TEvent>[]
  ): Promise<FinalizedChangeSet<unknown>[]> {
    // Count the number of IDs needed.
    let idCount = 0;
    for (const [handler, work] of todo) {
      for (const [, involved] of work) {
        eventCounter.inc({ kind: String(handler.kind) });
        idCount += countNewIds(involved);
      }
    }

    this.provideIds(await idLoan.borrow(idCount));

    // Run all events.
    for (const [handler, work] of todo) {
      for (const [event, involved] of work) {
        this.apply(handler, event, involved);
      }
    }

    // Commit the batch.
    return this.build();
  }

  private makeAclChecker(value: AclCheckDomain): AclChecker {
    const protectionEntities = this.versionedEntitySource.aclEntitiesForDomain(
      value.domain
    );
    const user = this.versionedEntitySource.get("none", value.userId)?.[1];
    const teamId = user?.playerCurrentTeam()?.team_id;

    const restorationEntities = prioritizeRestorationEntities(
      this.versionedEntitySource.restorationEntitiesForDomain(value.domain)
    );

    const allTerrain = involvedShardsForAclDomain(value.domain).map((s) => {
      const [, terrain] = this.versionedEntitySource.get(
        "terrain",
        new ByKey("terrainByShardId", s)
      );
      if (!terrain) {
        throw new Error(`Missing terrain ${shardDecode(s)}`);
      }
      return terrain;
    });

    const hasRole = (role: SpecialRoles) =>
      !!user?.userRoles()?.roles.has(role);

    return {
      kind: "aclChecker",
      canPerformItemAction(item, options) {
        return itemActionAllowed(item, (action) => this.can(action, options));
      },
      can: (
        action: AclAction,
        options?: { atPoints?: ReadonlyVec3[]; entity?: ReadonlyDelta }
      ): boolean => {
        if (options?.entity) {
          const entity = options.entity;

          // Temporary entities are fair game for destruction by anyone.
          if (
            entity.restoresTo()?.restore_to_state === "deleted" &&
            ALLOWED_TEMPORARY_BLOCK_ACTIONS.includes(action)
          ) {
            return true;
          }

          // First check for any ACLs associated specifically with the entity.
          if (entity.has("acl_component")) {
            const entityAclCheck = actionAllowed(
              [
                aclForEntity({
                  id: entity.id,
                  acl_component: entity.aclComponent(),
                }),
              ],
              action,
              { userId: value.userId, teamId },
              hasRole
            );
            if (!entityAclCheck) {
              return false;
            }
          }
        } else {
          if (ALLOWED_TEMPORARY_BLOCK_ACTIONS.includes(action)) {
            // If we're destroying terrain that's already slated for
            // destruction, then its fair game for anyone.
            const pointsByShard = pointsByShardForAclDomain(
              options?.atPoints
                ? { kind: "points", points: options?.atPoints }
                : value.domain
            );
            if (isTerrainRestoring(allTerrain, pointsByShard)) {
              return true;
            }
          }
        }

        const narrowedProtectionEntities = options?.atPoints
          ? narrowAclEntities(protectionEntities, options.atPoints)
          : protectionEntities;
        const acls = aclsForEntities(narrowedProtectionEntities);
        return actionAllowed(
          acls,
          action,
          { userId: value.userId, teamId },
          hasRole
        );
      },
      restoreTimeSecs: (action: AclAction) =>
        restorationDelay(
          value.userId,
          teamId,
          hasRole,
          action,
          restorationEntities,
          value.domain,
          allTerrain
        ),
    };
  }
}
