import type { IdempotentFirehoseEvent } from "@/server/shared/firehose/api";
import type { TriggerContext } from "@/server/shared/triggers/core";
import type { RootExecutor } from "@/server/shared/triggers/roots/root";
import type { WorldApi } from "@/server/shared/world/api";
import type { ChangeToApply } from "@/shared/api/transaction";
import { getBiscuits } from "@/shared/bikkie/active";
import type { Delta } from "@/shared/ecs/gen/delta";
import type { ItemBag, LifetimeStatsType } from "@/shared/ecs/gen/types";
import type { FirehoseEvent } from "@/shared/firehose/events";
import { anItem, cloneDeepWithItems } from "@/shared/game/item";
import { addToBag, bagContains, countOf, createBag } from "@/shared/game/items";
import { stringToItemBag } from "@/shared/game/items_serde";
import type { ItemAndCount } from "@/shared/game/types";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import type { MetaState } from "@/shared/triggers/base_schema";
import {
  deserializeTriggerState,
  serializeTriggerState,
} from "@/shared/triggers/state";
import {
  DefaultMap,
  MultiMap,
  compactMap,
  getOrCreate,
  mapMap,
} from "@/shared/util/collections";
import { removeUndefinedInPlace } from "@/shared/util/object";
import { isEqual } from "lodash";
import type { ZodTypeAny } from "zod";
import { z } from "zod";

function fanOutLifetimeStats(
  events: ReadonlyArray<FirehoseEvent>
): Map<LifetimeStatsType, ItemBag> {
  const retList = new MultiMap<LifetimeStatsType, ItemAndCount>();

  for (const event of events) {
    switch (event.kind) {
      case "collect":
        retList.addAll("collected", stringToItemBag(event.bag).values());
        if (event.mined) {
          retList.addAll("mined", stringToItemBag(event.bag).values());
        }
        break;
      case "fished":
        retList.addAll("fished", stringToItemBag(event.bag).values());
        break;
      case "consume":
        retList.add("consumed", countOf(event.item));
        break;
      case "craft":
        retList.addAll("crafted", stringToItemBag(event.bag).values());
        break;
      case "blueprintBuilt":
        {
          const turnsInto = anItem(event.blueprint).turnsInto;
          if (turnsInto) {
            retList.add("crafted", countOf(turnsInto));
          }
        }
        break;
      case "growSeed":
        retList.add("grown", countOf(event.seed));
        break;
      case "postPhoto":
        const taggedBiscuits = compactMap(event.taggedObjects, (e) =>
          e.kind === "entity" && e.biscuitId ? countOf(e.biscuitId) : undefined
        );
        retList.addAll("takenPhoto", taggedBiscuits);
    }
  }

  const ret = new Map<LifetimeStatsType, ItemBag>();
  for (const [k, v] of retList.underlyingMap) {
    ret.set(k, createBag(...v));
  }
  return ret;
}

export function addToLifetimeStats(
  entity: Delta,
  type: LifetimeStatsType,
  bag: ItemBag
) {
  if (bag.size === 0) {
    return;
  }
  const stats = entity.mutableLifetimeStats().stats;
  const items = stats.get(type) ?? createBag();

  // Strip the payload from all items and add to stats.
  for (const { item, count } of bag.values()) {
    addToBag(items, countOf(item.id, count));
  }
  if (!stats.has(type)) {
    stats.set(type, items);
  }
}

class TriggerContextImpl implements TriggerContext {
  public readonly outEvents: FirehoseEvent[] = [];

  constructor(
    public readonly rootId: BiomesId,
    public readonly entity: Delta,
    public readonly events: ReadonlyArray<FirehoseEvent>
  ) {}

  publish(event: FirehoseEvent) {
    this.outEvents.push(event);
  }

  updateState<T extends ZodTypeAny>(
    id: BiomesId,
    schema: T,
    fn: (state: MetaState<z.infer<T>>) => MetaState<z.infer<T>>
  ): MetaState<z.infer<T>> {
    const rawState = this.entity
      .triggerState()
      ?.by_root.get(this.rootId)
      ?.get(id);

    const triggerState = (() => {
      try {
        return deserializeTriggerState(rawState, schema);
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          const anyPayload = deserializeTriggerState(rawState, z.any());
          log.error(
            `Invalid payload data for trigger state (rootId: ${this.rootId}, spec id: ${id}). Resetting trigger state payload.`
          );
          anyPayload.payload = undefined;
          return anyPayload as MetaState<z.infer<T>>;
        } else {
          throw error;
        }
      }
    })();

    const meta = removeUndefinedInPlace(triggerState);
    const newMeta = removeUndefinedInPlace(fn(cloneDeepWithItems(meta)));
    if (!isEqual(newMeta, meta) || (isEqual(newMeta, {}) && rawState)) {
      const stateTree = getOrCreate(
        this.entity.mutableTriggerState().by_root,
        this.rootId,
        () => new Map()
      );
      const serialized = serializeTriggerState(newMeta);
      if (!serialized) {
        stateTree.delete(id);
      } else {
        stateTree.set(id, serialized);
      }
    }
    return newMeta;
  }

  clearState(id: BiomesId): void {
    if (this.entity.triggerState()?.by_root.get(this.rootId)?.has(id)) {
      this.entity.mutableTriggerState().by_root.get(this.rootId)?.delete(id);
    }
  }
}

// Actually run triggers for a given entity.
export class TriggerEngine {
  constructor(private readonly worldApi: WorldApi) {}

  private processAllTriggers(
    patchable: Delta,
    executors: RootExecutor[],
    inEvents: ReadonlyArray<FirehoseEvent>
  ): FirehoseEvent[] {
    const outEvents: FirehoseEvent[] = [];
    for (const executor of executors) {
      const fork = patchable.fork();
      const context = new TriggerContextImpl(executor.id, fork, inEvents);
      try {
        executor.run(context);
        outEvents.push(...context.outEvents);
        fork.commit();
      } catch (error: any) {
        log.error("Error running trigger executor: ", {
          error,
          trigger: executor.id,
        });
      }
    }
    return outEvents;
  }

  private updateLifetimeStats(
    entity: Delta,
    inEvents: ReadonlyArray<FirehoseEvent>
  ): FirehoseEvent[] {
    const fannedOut = fanOutLifetimeStats(inEvents);
    const discoveries = new DefaultMap<LifetimeStatsType, Set<BiomesId>>(
      () => new Set()
    );
    const stats = entity.lifetimeStats()?.stats;
    for (const [k, v] of fannedOut) {
      const existing = stats?.get(k);
      for (const [_, item] of v) {
        if (
          !existing ||
          !bagContains(existing, item.item, {
            respectPayload: false,
          })
        ) {
          discoveries.get(k).add(item.item.id);
        }
      }
      addToLifetimeStats(entity, k, v);
    }

    if (discoveries.size === 0) {
      return [];
    }
    return [
      {
        kind: "discovered",
        entityId: entity.id,
        contents: mapMap(discoveries, (v, k) => [k, [...v]]),
      },
    ];
  }

  private cleanupStaleChallenges(entity: Delta, executors: RootExecutor[]) {
    const allIds = new Set<BiomesId>(executors.map((e) => e.id));

    // Remove unknown IDs from a given Map or set.
    const filterMap = (
      map: ReadonlyMap<BiomesId, unknown>,
      mutable: () => Map<BiomesId, unknown>
    ) => {
      for (const id of map.keys()) {
        if (!allIds.has(id)) {
          mutable().delete(id);
        }
      }
    };

    const filterSet = (
      set: ReadonlySet<BiomesId>,
      mutable: () => Set<BiomesId>
    ) => {
      for (const id of set) {
        if (!allIds.has(id)) {
          mutable().delete(id);
        }
      }
    };

    // Clean all references to now-unknown triggers.
    if (entity.triggerState()) {
      filterMap(
        entity.triggerState()!.by_root,
        () => entity.mutableTriggerState().by_root
      );
    }
    if (entity.challenges()) {
      filterSet(
        entity.challenges()!.in_progress,
        () => entity.mutableChallenges().in_progress
      );
      filterSet(
        entity.challenges()!.complete,
        () => entity.mutableChallenges().complete
      );
      filterSet(
        entity.challenges()!.available,
        () => entity.mutableChallenges().available
      );
      filterMap(
        entity.challenges()!.started_at,
        () => entity.mutableChallenges().started_at
      );
      filterMap(
        entity.challenges()!.finished_at,
        () => entity.mutableChallenges().finished_at
      );
    }
  }

  private cleanupStaleRecipes(entity: Delta) {
    const allIds = new Set<BiomesId>(getBiscuits("/recipes").map((r) => r.id));
    if (entity.recipeBook()) {
      for (const [key, item] of entity.recipeBook()!.recipes) {
        if (!allIds.has(item.id)) {
          entity.mutableRecipeBook().recipes.delete(key);
        }
      }
    }
  }

  private cleanupStaleState(entity: Delta, executors: RootExecutor[]) {
    this.cleanupStaleChallenges(entity, executors);
    this.cleanupStaleRecipes(entity);
  }

  private async attempt(
    id: BiomesId,
    executors: RootExecutor[],
    inEvents: ReadonlyArray<FirehoseEvent>
  ): Promise<"success" | { kind: "failure"; why: unknown }> {
    const [version, entity] = await this.worldApi.getWithVersion(id);
    if (!entity?.hasRemoteConnection()) {
      return "success";
    }
    const patchable = entity.edit();
    this.cleanupStaleState(patchable, executors);
    const events = [
      ...this.processAllTriggers(patchable, executors, inEvents),
      ...this.updateLifetimeStats(patchable, inEvents),
    ];
    const delta = patchable.finish();
    if (events.length === 0 && delta === undefined) {
      return "success";
    }
    const transaction: ChangeToApply = {
      iffs: [[id, version, ...patchable.readComponentIds]],
      changes:
        delta === undefined
          ? []
          : [
              {
                kind: "update",
                entity: delta,
              },
            ],
      events,
    };
    const { outcome } = await this.worldApi.apply(transaction);
    if (outcome === "aborted") {
      return { kind: "failure", why: transaction };
    }
    return "success";
  }

  // Tick all triggers for this entity.
  async process(
    id: BiomesId,
    executors: RootExecutor[],
    events: ReadonlyArray<IdempotentFirehoseEvent>
  ) {
    let result: "success" | unknown;
    for (let i = 0; i < CONFIG.triggerTransactionMaxAttempts; ++i) {
      result = await this.attempt(id, executors, events);
      if (result === "success") {
        return;
      } else {
        log.warn("Trigger transaction failed - retrying", {
          attempts: i,
          lastResult: result,
        });
      }
    }
    log.error("Unable to process triggers for entity - abandoning", {
      id,
      attempts: CONFIG.triggerTransactionMaxAttempts,
      lastResult: result,
    });
  }
}

export async function registerTriggerEngine<
  C extends {
    worldApi: WorldApi;
  }
>(loader: RegistryLoader<C>) {
  return new TriggerEngine(await loader.get("worldApi"));
}
