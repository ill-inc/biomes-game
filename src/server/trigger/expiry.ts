import { GameEvent } from "@/server/shared/api/game_event";
import type { LogicApi } from "@/server/shared/api/logic";
import { LogicContentionError } from "@/server/shared/api/logic";
import type { LazyEntity, LazyEntityWith } from "@/server/shared/ecs/gen/lazy";
import type {
  LazyChange,
  LazyCreate,
  LazyUpdate,
} from "@/server/shared/ecs/lazy";
import type { LazyReplica } from "@/server/shared/replica/lazy_table";
import type { WorldApi } from "@/server/shared/world/api";
import type { TriggerServerContext } from "@/server/trigger/main";
import { BackgroundTaskController } from "@/shared/abort";
import type { Iff } from "@/shared/api/transaction";
import type { ProposedChange } from "@/shared/ecs/change";
import { changedBiomesId } from "@/shared/ecs/change";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { Iced } from "@/shared/ecs/gen/components";
import {
  ExpireBuffsEvent,
  ExpireMinigameInstanceEvent,
  ExpireRobotEvent,
  ExpireTradeEvent,
  MinigameInstanceTickEvent,
  RestoreGroupEvent,
  RestorePlaceableEvent,
} from "@/shared/ecs/gen/events";
import { getAabbForEntity } from "@/shared/game/entity_sizes";
import { boxToAabb } from "@/shared/game/group";
import { getAabbForPlaceableEntity } from "@/shared/game/placeables";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { unionAABB } from "@/shared/math/linear";
import type { ReadonlyAABB } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import { ConditionVariable, sleep } from "@/shared/util/async";
import { compactMap } from "@/shared/util/collections";
import { assertNever } from "@/shared/util/type_helpers";
import { ok } from "assert";
import { remove } from "lodash";

export interface Expiry {
  type:
    | "delete"
    | "expireBuffs"
    | "expireRobot"
    | "expireMinigameInstance"
    | "expireTrade"
    | "ice"
    | "minigameInstanceTick"
    | "removeWarp"
    | "restoreEntity";
  when: number; // Milliseconds since world-epoch.
  id: BiomesId;
}

// Represents a set of expiry trigger, is only sorted on demand.
class ExpirySet {
  private dirty: boolean;

  constructor(private readonly triggers: Expiry[]) {
    this.dirty = triggers.length > 1;
  }

  get empty(): boolean {
    return this.triggers.length === 0;
  }

  get size(): number {
    return this.triggers.length;
  }

  private cleanIfNeeded() {
    if (this.dirty) {
      this.triggers.sort((a, b) => a.when - b.when);
      this.dirty = false;
    }
  }

  markDirty() {
    this.dirty = true;
  }

  // Get the earliest trigger, or undefined if empty.
  peek(): Expiry | undefined {
    this.cleanIfNeeded();
    return this.triggers[0];
  }

  // Pop and return the earliest trigger.
  pop(): Expiry {
    ok(this.triggers.length > 0);
    this.cleanIfNeeded();
    return this.triggers.shift()!;
  }

  // Clear the set.
  clear() {
    this.triggers.length = 0;
    this.dirty = false;
  }

  // Push new items into the set.
  push(...expiries: Expiry[]) {
    this.triggers.push(...expiries);
    this.dirty = this.triggers.length > 1;
  }

  // Remove a given array of triggers.
  remove(triggers: Expiry[]) {
    if (triggers.length === 0) {
      return;
    }
    const asSet = new Set(triggers);
    remove(this.triggers, (trigger) => asSet.has(trigger));
  }

  // Remove triggers with a given entity ID.
  removeById(id: BiomesId) {
    remove(this.triggers, (trigger) => trigger.id === id);
  }

  // Remove triggers with a type, return those removed.
  removeByType(type: Expiry["type"]): Expiry[] {
    return remove(this.triggers, (trigger) => trigger.type === type);
  }

  // Update the timestamp of an existing trigger, returning true if successful.
  updateWhen(type: Expiry["type"], when: number): boolean {
    const trigger = this.triggers.find((trigger) => trigger.type === type);
    if (trigger) {
      trigger.when = when;
      this.dirty = true;
      return true;
    }
    return false;
  }

  // Note, iteration order is not guaranteed.
  [Symbol.iterator]() {
    return this.triggers[Symbol.iterator]();
  }
}

type ExpiryAction = [Expiry, ProposedChange | undefined, GameEvent | undefined];
type ExpiryActionWithEvent = [Expiry, ProposedChange | undefined, GameEvent];
type ExpiryActionWithChange = [Expiry, ProposedChange, GameEvent | undefined];

// Handle expiring entities and components.
export class ExpiryProcessor {
  private readonly controller = new BackgroundTaskController();
  private readonly triggers = new ExpirySet([]);
  private readonly triggersByEntity = new Map<BiomesId, ExpirySet>();

  constructor(
    private readonly logicApi: LogicApi,
    private readonly worldApi: WorldApi,
    private readonly triggerReplica: LazyReplica
  ) {}

  private handleChanges(changes: LazyChange[]) {
    for (const change of changes) {
      switch (change.kind) {
        case "delete":
          this.delete(change.id);
          break;
        case "create":
        case "update":
          this.update(change);
          break;
        default:
          assertNever(change);
      }
    }
  }

  private delete(id: BiomesId) {
    if (this.triggersByEntity.delete(id)) {
      this.triggers.removeById(id);
    }
  }

  private update({ entity }: LazyCreate | LazyUpdate) {
    if (
      !entity.altersExpires() &&
      !entity.altersIcing() &&
      !entity.altersWarpable() &&
      !entity.altersRobotComponent() &&
      !entity.altersBuffsComponent() &&
      !entity.altersMinigameInstanceTickInfo() &&
      !entity.altersMinigameInstanceExpire() &&
      !entity.altersTrade() &&
      !entity.altersRestoresTo()
    ) {
      return; // Nothing to do.
    }
    const toRemove: Expiry[] = [];
    const existing = this.triggersByEntity.get(entity.id);

    const handleTrigger = (
      type: Expiry["type"],
      component: { trigger_at: number | undefined } | null | undefined
    ) => {
      // Handle deletion of the trigger.
      if (component === null) {
        if (existing !== undefined) {
          // Remove it from the list of triggers if present.
          toRemove.push(...existing.removeByType(type));
        }
      } else if (component) {
        const { trigger_at: when } = component;
        if (when === undefined) {
          // Defuse existing triggers if trigger_at was set to undefined.
          if (existing !== undefined) {
            toRemove.push(...existing.removeByType(type));
          }
          return;
        }
        // Check for an existing trigger and update the timestamp.
        if (existing !== undefined && existing.updateWhen(type, when)) {
          this.triggers.markDirty();
          return;
        }
        const trigger = {
          type,
          when,
          id: entity.id,
        };
        this.pushTriggers(trigger);
      }
    };

    handleTrigger("delete", entity.expires());
    handleTrigger("ice", entity.icing());
    handleTrigger("removeWarp", entity.warpable());
    handleTrigger("expireRobot", entity.robotComponent());
    handleTrigger("expireBuffs", entity.buffsComponent());
    handleTrigger("expireMinigameInstance", entity.minigameInstanceExpire());
    handleTrigger("expireTrade", entity.trade());
    handleTrigger("minigameInstanceTick", entity.minigameInstanceTickInfo());
    handleTrigger("restoreEntity", entity.restoresTo());

    if (toRemove.length > 0) {
      this.triggers.remove(toRemove);
    }
  }

  private pushTriggers(...triggers: Expiry[]) {
    this.triggers.push(...triggers);
    for (const trigger of triggers) {
      const existing = this.triggersByEntity.get(trigger.id);
      if (existing === undefined) {
        this.triggersByEntity.set(trigger.id, new ExpirySet([trigger]));
      } else {
        existing.push(trigger);
      }
    }
  }

  private popTrigger(): ExpiryAction | undefined {
    if ((this.triggers.peek()?.when ?? Infinity) > secondsSinceEpoch()) {
      return;
    }
    const trigger = this.triggers.pop();
    this.triggersByEntity.get(trigger.id)?.removeByType(trigger.type);
    switch (trigger.type) {
      case "delete":
        log.debug(`Deleting ${trigger.id}`);
        return [trigger, { kind: "delete", id: trigger.id }, undefined];
      case "ice":
        log.debug(`Icing ${trigger.id}`);
        return [
          trigger,
          {
            kind: "update",
            entity: {
              id: trigger.id,
              iced: Iced.create(),
              icing: null,
            },
          },
          undefined,
        ];
      case "removeWarp":
        log.debug(`Removing warp from ${trigger.id}`);
        return [
          trigger,
          {
            kind: "update",
            entity: {
              id: trigger.id,
              warpable: null,
            },
          },
          undefined,
        ];
      case "expireRobot":
        log.debug(`Expire robot event for ${trigger.id}`);
        return [
          trigger,
          undefined,
          new GameEvent(trigger.id, new ExpireRobotEvent({ id: trigger.id })),
        ];
      case "expireBuffs":
        log.debug(`Expire buffs event for ${trigger.id}`);
        return [
          trigger,
          undefined,
          new GameEvent(trigger.id, new ExpireBuffsEvent({ id: trigger.id })),
        ];
      case "expireTrade":
        log.debug(`Expire trade event for ${trigger.id}`);
        return [
          trigger,
          undefined,
          new GameEvent(trigger.id, new ExpireTradeEvent({ id: trigger.id })),
        ];
      case "expireMinigameInstance": {
        log.debug(`Expire minigame instance event for ${trigger.id}`);
        const minigameInstance = this.triggerReplica.get(trigger.id);
        if (!minigameInstance || !minigameInstance.minigameInstance()) {
          return;
        }
        return [
          trigger,
          undefined,
          new GameEvent(
            trigger.id,
            new ExpireMinigameInstanceEvent({
              minigame_id: minigameInstance.minigameInstance()!.minigame_id,
              minigame_instance_id: minigameInstance.id,
              denorm_space_clipboard_info:
                minigameInstance.minigameInstance()!.space_clipboard,
            })
          ),
        ];
      }
      case "minigameInstanceTick": {
        const minigameInstance = this.triggerReplica.get(trigger.id);
        log.debug(`Minigame instance tick event for ${trigger.id}`, {
          kind: minigameInstance?.minigameInstance()?.state.kind,
        });
        if (!minigameInstance || !minigameInstance.minigameInstance()) {
          return;
        }
        return [
          trigger,
          undefined,
          new GameEvent(
            trigger.id,
            new MinigameInstanceTickEvent({
              minigame_id: minigameInstance.minigameInstance()!.minigame_id,
              minigame_instance_id: minigameInstance.id,
              denorm_space_clipboard_info:
                minigameInstance.minigameInstance()!.space_clipboard,
            })
          ),
        ];
      }
      case "restoreEntity": {
        const entity = this.triggerReplica.get(trigger.id);
        if (entity?.has("group_component", "box")) {
          // Need to gather up the grouped entities so that we can compute the
          // group's bounding box ahead of time.
          const groupedEntityIds = entity.groupedEntities()?.ids ?? [];
          const groupedEntities = groupedEntityIds
            .map((id) => this.triggerReplica.get(id))
            .filter((x): x is LazyEntity => !!x);
          return [
            trigger,
            undefined,
            new GameEvent(
              entity.id,
              new RestoreGroupEvent({
                id: entity.id,
                placeable_ids: groupedEntityIds,
                restoreRegion:
                  entity.restoresTo()?.restore_to_state === "created"
                    ? aabbForGroup(entity, groupedEntities)
                    : undefined,
              })
            ),
          ];
        } else if (entity?.placeableComponent()) {
          return [
            trigger,
            undefined,
            new GameEvent(
              entity.id,
              new RestorePlaceableEvent({
                id: entity.id,
                restoreRegion:
                  entity.restoresTo()?.restore_to_state === "created"
                    ? getAabbForPlaceableEntity(entity.materialize())
                    : undefined,
              })
            ),
          ];
        } else {
          log.error(
            `Unknown entity ${trigger.id} with 'restores_to' component.`
          );
        }
      }
    }
  }

  private async handleTriggers(signal: AbortSignal) {
    const actionsWithEvents: ExpiryActionWithEvent[] = [];
    const actionsWithChanges: ExpiryActionWithChange[] = [];
    while (!signal.aborted) {
      const action = this.popTrigger();
      if (!action) {
        break;
      } else if (action[2]) {
        actionsWithEvents.push(action as ExpiryActionWithEvent);
      } else if (action[1]) {
        actionsWithChanges.push(action as ExpiryActionWithChange);
      }
    }

    if (actionsWithEvents.length > 0) {
      // Wait for events to be published first, if this fails the components
      // have not changed so will be retried again on the next pass.
      try {
        await this.logicApi.publish(
          ...actionsWithEvents.map(([, , event]) => event)
        );
        for (const action of actionsWithEvents) {
          if (action[1]) {
            actionsWithChanges.push(action as ExpiryActionWithChange);
          }
        }
      } catch (error: unknown) {
        if (error instanceof LogicContentionError) {
          const contentionError = error;
          this.pushTriggers(
            ...compactMap(actionsWithEvents, ([trigger, , event]) =>
              contentionError.events.includes(event) ? trigger : undefined
            )
          );
        } else {
          log.error("Failed to publish events for triggers", { error });
          this.pushTriggers(...actionsWithEvents.map(([trigger]) => trigger));
        }
      }
    }

    if (actionsWithChanges.length > 0) {
      try {
        // Ignore transaction results, if there's a failure it can only
        // be because the entity was deleted.
        await this.worldApi.apply(
          actionsWithChanges.map(([, change]) => ({
            iffs: [[changedBiomesId(change)] as Iff],
            changes: [change],
          }))
        );
      } catch (error) {
        log.error("Failed to process transactions triggers", { error });
        this.pushTriggers(...actionsWithChanges.map(([trigger]) => trigger));
      }
    }
  }

  async run(signal: AbortSignal) {
    const cv = new ConditionVariable();
    this.controller.runInBackground("expirySubscribe", async (signal) => {
      for await (const { bootstrapped, changes } of this.worldApi.subscribe(
        {
          filter: {
            anyOf: [
              "expires",
              "icing",
              "warpable",
              "robot_component",
              "buffs_component",
              "minigame_instance_tick_info",
              "minigame_instance_expire",
              "restores_to",
              "trade",
            ],
          },
        },
        signal
      )) {
        this.handleChanges(changes);
        if (bootstrapped) {
          cv.signal();
        }
      }
    });
    await cv.wait();
    try {
      while (await sleep(1000 / CONFIG.triggerExpiryHz, signal)) {
        await this.handleTriggers(signal);
      }
    } finally {
      await this.controller.abortAndWait();
    }
  }
}

function aabbForGroup(
  group: LazyEntityWith<"group_component" | "box">,
  groupedEntities: LazyEntity[]
): ReadonlyAABB {
  let aabb = boxToAabb(group.box());
  groupedEntities.forEach((entity, i) => {
    ok(entity.id === group.groupedEntities()?.ids[i]);
    const entityAabb = getAabbForEntity(entity.materialize());
    if (!entityAabb) {
      return;
    }
    aabb = unionAABB(aabb, entityAabb);
  });
  return aabb;
}

export async function registerExpiryProcessor<C extends TriggerServerContext>(
  loader: RegistryLoader<C>
) {
  const [logicApi, worldApi, replica] = await Promise.all([
    loader.get("logicApi"),
    loader.get("worldApi"),
    loader.get("triggerReplica"),
  ]);
  return new ExpiryProcessor(logicApi, worldApi, replica);
}
