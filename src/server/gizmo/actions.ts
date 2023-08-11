import type { Action, ActionContext } from "@/server/gizmo/state";
import { moveVertically, type GremlinState } from "@/server/gizmo/state";
import type { GizmoTable } from "@/server/gizmo/table";
import {
  addChatMessage,
  chooseRandomSelectableItem,
  chooseRandomWearables,
  getBounds,
  getContentsAtPosition,
  gremlinOutsideBounds,
  playerIntersectingWithTerrain,
} from "@/server/gizmo/util";
import { safeGetTerrainId } from "@/shared/asset_defs/terrain";
import { getBiscuit } from "@/shared/bikkie/active";
import { BikkieIds, WEARABLE_SLOTS } from "@/shared/bikkie/ids";
import type { Event } from "@/shared/ecs/gen/events";
import {
  EditEvent,
  InternalInventorySetEvent,
  InventoryChangeSelectionEvent,
  MoveEvent,
  UnmuckerEvent,
} from "@/shared/ecs/gen/events";
import type { ItemAndCount, OwnedItemReference } from "@/shared/ecs/gen/types";
import { countOf } from "@/shared/game/items";
import * as Shards from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import {
  add,
  containsAABB,
  randomInAABB,
  round,
  scale,
  sub,
  viewDir,
} from "@/shared/math/linear";
import type { ReadonlyAABB } from "@/shared/math/types";
import { isEqual } from "lodash";

export function initializeState(bounds: ReadonlyAABB): GremlinState {
  let position = randomInAABB(CONFIG.gremlinStartingArea, true);
  if (!containsAABB(bounds, position)) {
    position = randomInAABB(bounds, true);
    // Start at the sky
    position[1] = bounds[1][1] - 3;
    log.debug(
      "Gremlin starting position outside bounds, choosing random position.",
      {
        position,
      }
    );
  }
  return {
    position,
    orientation: [0, 0],
    action: new RiseAction(),
    selectedItem: chooseRandomSelectableItem(),
    wearableAssignment: chooseRandomWearables(),
    unmucker: false,
    messages: [],
    events: [],
  };
}

class RiseAction implements Action {
  tick({ timeInState, dt, prevState, resources }: ActionContext): GremlinState {
    if (
      timeInState < CONFIG.gremlinsRiseTimeSecs ||
      playerIntersectingWithTerrain(prevState.position, resources)
    ) {
      const newState = moveVertically(
        prevState,
        dt * CONFIG.gremlinsSpeedMetersPerSec
      );
      if (!gremlinOutsideBounds(newState.position, resources)) {
        return newState;
      }
    }

    const newState = {
      ...prevState,
      // When we're done rising, select a random item to equip.
      selectedItem: chooseRandomSelectableItem(),
      action: new FlyForwardAction(),
    };

    if (Math.random() < CONFIG.gremlinsChanceToSwitchWearables) {
      newState.wearableAssignment = chooseRandomWearables();
    }

    if (Math.random() < CONFIG.gremlinsChanceToChat) {
      newState.messages = addChatMessage(
        prevState.messages,
        Math.floor(Math.random() * CONFIG.gremlinsChatConversationLength)
      );
    }

    return newState;
  }
}

class FlyForwardAction implements Action {
  // Amount of time, in seconds, that we will rotate for.
  private readonly turnTime = Math.random() * CONFIG.gremlinsMaxTurnTimeSecs;
  private readonly timeToStop =
    Math.random() *
      (CONFIG.gremlinsMaxFlyTimeSecs - CONFIG.gremlinsMinFlyTimeSecs) +
    CONFIG.gremlinsMinFlyTimeSecs;

  tick({ timeInState, dt, prevState, resources }: ActionContext): GremlinState {
    // If we've been in this action for long enough, switch to the dive action.
    if (timeInState > this.timeToStop) {
      return {
        ...prevState,
        action: new DiveAction(),
      };
    }

    // Dodge the ground!
    if (playerIntersectingWithTerrain(prevState.position, resources)) {
      return moveVertically(prevState, dt * CONFIG.gremlinsSpeedMetersPerSec);
    }

    // We only turn in one direction for now to keep things simple.
    let newOrientation = prevState.orientation;
    if (timeInState < this.turnTime) {
      newOrientation = [
        prevState.orientation[0],
        (prevState.orientation[1] +
          Math.PI * 2 * dt * CONFIG.gremlinsTurnSpeedInRevsPerSec) %
          (Math.PI * 2),
      ];
    }

    // Move in the direction we are facing.
    const dir = viewDir(newOrientation);
    const translate = scale(dt * CONFIG.gremlinsSpeedMetersPerSec, dir);

    return {
      ...prevState,
      position: add(prevState.position, translate),
      orientation: newOrientation,
    };
  }
}

class UnmuckAction implements Action {
  private readonly timeToStop = Math.random() * CONFIG.gremlinsUnmuckTimeSecs;

  tick({ timeInState, prevState }: ActionContext): GremlinState {
    if (timeInState > this.timeToStop) {
      return {
        ...prevState,
        unmucker: false,
        action: new RiseAction(),
      };
    }
    return {
      ...prevState,
      unmucker: true,
    };
  }
}

class BuildAction implements Action {
  private readonly timeToStop = Math.random() * CONFIG.gremlinsBuildTimeSecs;
  private timeToNextBuildStep = 0;
  private building = true;

  tick({
    id,
    dt,
    timeInState,
    prevState,
    resources,
  }: ActionContext): GremlinState {
    const done = () => ({ ...prevState, action: new RiseAction() });
    if (this.building && timeInState > this.timeToStop) {
      return done();
    }
    if (this.timeToNextBuildStep > 0) {
      this.timeToNextBuildStep -= dt;
      return prevState;
    }
    this.timeToNextBuildStep = Math.random() * CONFIG.gremlinsBuildStepTimeSecs;
    // Determine if we're on terrain we can edit.
    const position = round(add(prevState.position, [0, 2, 0]));
    const shardId = Shards.voxelShard(...position);
    const terrainId = resources.get("/ecs/terrain", shardId)?.id;
    if (!terrainId) {
      return done();
    }
    // Get the current contents of that position.
    const current = getContentsAtPosition(
      shardId,
      Shards.blockPos(...position),
      resources
    );
    if (this.building) {
      // Place a clay block above my head.
      if (current) {
        // Something's there already, give up.
        return done();
      }
      const clayTerrainId = safeGetTerrainId(
        getBiscuit(BikkieIds.clay).terrainName
      );
      if (!clayTerrainId) {
        // No clay, give up.
        return done();
      }
      this.building = false;
      return {
        ...prevState,
        events: [
          new EditEvent({
            id: terrainId,
            position,
            value: clayTerrainId,
            user_id: id,
          }),
        ],
      };
    } else {
      // Destroy a clay block above my head.
      if (!current || current !== BikkieIds.clay) {
        // Not the clay we expected, give up.
        return done();
      }
      this.building = true;
      return {
        ...prevState,
        events: [
          new EditEvent({ id: terrainId, position, value: 0, user_id: id }),
        ],
      };
    }
  }
}

class DiveAction implements Action {
  tick({ dt, prevState, resources }: ActionContext): GremlinState {
    if (!playerIntersectingWithTerrain(prevState.position, resources)) {
      return moveVertically(prevState, -dt * CONFIG.gremlinsSpeedMetersPerSec);
    }
    let roll = Math.random();
    for (const [prob, action] of [
      [CONFIG.gremlinsChanceToBuild, new BuildAction()],
      [CONFIG.gremlinsChanceToUnMuck, new UnmuckAction()],
      [1.0, new RiseAction()],
    ] as [number, Action][]) {
      if (roll < prob) {
        return {
          ...prevState,
          action,
        };
      }
      roll -= prob;
    }
    return prevState;
  }
}

export function tickGremlinState(input: ActionContext): GremlinState {
  if (gremlinOutsideBounds(input.prevState.position, input.resources)) {
    // The gremlin is outside of the world, reset it.
    log.debug("Gremlin outside world, resetting");
    return initializeState(getBounds(input.resources));
  }
  return input.prevState.action.tick(input);
}

function itemAndCountForItemId(
  itemId: BiomesId | undefined
): ItemAndCount | undefined {
  if (!itemId) {
    return;
  }
  return countOf(itemId);
}

// Compares an old state to a new state and calls the provided emit() function
// as necessary for all modified state data.
export function getStateChangeEvents(
  table: GizmoTable,
  oldState: GremlinState | undefined,
  newState: GremlinState,
  userId: BiomesId
): Event[] {
  const events: Event[] = Array.from(newState.events);
  newState.events.length = 0;

  if (
    !isEqual(oldState?.position, newState.position) ||
    !isEqual(oldState?.orientation, newState.orientation)
  ) {
    events.push(
      new MoveEvent({
        id: userId,
        position: newState.position,
        velocity: sub(newState.position, oldState?.position ?? [0, 0, 0]),
        orientation: newState.orientation,
      })
    );
  }

  if (
    oldState === undefined ||
    !isEqual(oldState.selectedItem, newState.selectedItem)
  ) {
    const slotRef = {
      kind: "hotbar",
      idx: 0,
    } as OwnedItemReference;

    events.push(
      new InternalInventorySetEvent({
        id: userId,
        dst: slotRef,
        item: itemAndCountForItemId(newState.selectedItem),
      })
    );
    events.push(
      new InventoryChangeSelectionEvent({ id: userId, ref: slotRef })
    );
  }

  if (!isEqual(oldState?.wearableAssignment, newState.wearableAssignment)) {
    WEARABLE_SLOTS.forEach((x) => {
      const newWearable = newState.wearableAssignment.get(x);
      if (oldState?.wearableAssignment.get(x) !== newWearable) {
        events.push(
          new InternalInventorySetEvent({
            id: userId,
            dst: { kind: "wearable", key: x },
            item: itemAndCountForItemId(newWearable),
          })
        );
      }
    });
  }

  if (oldState?.unmucker !== newState.unmucker) {
    events.push(new UnmuckerEvent({ id: userId, unmucker: newState.unmucker }));
  }

  return events;
}
