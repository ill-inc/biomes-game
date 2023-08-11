import type { GardenHoseEventKind } from "@/client/events/api";
import type {
  NUXStateData,
  NUXStateDefinition,
} from "@/client/game/context_managers/nux_manager";
import type { ClientResources } from "@/client/game/resources/types";
import type { NUXES, NUXStates } from "@/client/util/nux/state_machines";
import type { ItemBag, ReadonlyItemAndCount } from "@/shared/ecs/gen/types";
import { bagContains, countOf, createBag } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import { compact, map } from "lodash";

export const TIMED_NUX_TIME_MS = 10 * 1000;

export function timedNUXState<T extends NUXES>(
  nuxId: T,
  nextState: NUXStateData<NUXStates<T>> | "complete"
): NUXStateDefinition<NUXStates<T>> {
  return {
    subscribedEvents: ["nux_advance"],
    advance: (_ctx, data, event) => {
      if (event.kind === "nux_advance" && event.nuxId === nuxId) {
        return nextState;
      }
    },
  };
}

export function unlockWithFirstKind<ValidStates>(
  eventKind: GardenHoseEventKind,
  nextState: NUXStateData<ValidStates> | "complete"
): NUXStateDefinition<ValidStates> {
  return {
    subscribedEvents: [eventKind],
    advance: () => nextState,
  };
}

export function unlockWithChallengeState<ValidStates>(
  challengeId: BiomesId,
  nextState: NUXStateData<ValidStates> | "complete"
): NUXStateDefinition<ValidStates> {
  return {
    subscribedEvents: ["challenge_unlock"],
    advance: (_ctx, _data, event) => {
      if (event.kind === "challenge_unlock" && event.id === challengeId) {
        return nextState;
      }
    },
  };
}

export function unlockWithChallengeComplete<ValidStates>(
  challengeId: BiomesId,
  nextState: NUXStateData<ValidStates> | "complete"
): NUXStateDefinition<ValidStates> {
  return {
    subscribedEvents: ["challenge_complete"],
    advance: (_ctx, _data, event) => {
      if (event.kind === "challenge_complete" && event.id === challengeId) {
        return nextState;
      }
    },
  };
}

export function unlockWithChallengeStepStart<ValidStates>(
  stepId: BiomesId,
  nextState: NUXStateData<ValidStates> | "complete"
): NUXStateDefinition<ValidStates> {
  return {
    subscribedEvents: ["challenge_step_begin"],
    advance: (_ctx, _data, event) => {
      if (event.kind === "challenge_step_begin" && event.stepId === stepId) {
        return nextState;
      }
    },
  };
}

export function shortCircuitForStepComplete<ValidStates>(
  stepId: BiomesId,
  fn: NUXStateDefinition<ValidStates>["advance"]
): NUXStateDefinition<ValidStates>["advance"] {
  return (ctx, data, event) => {
    if (event.kind === "challenge_step_complete" && event.stepId === stepId) {
      return "complete";
    }

    return fn(ctx, data, event);
  };
}

export function unlockWithChallengeStepComplete<ValidStates>(
  stepId: BiomesId,
  nextState: NUXStateData<ValidStates> | "complete"
): NUXStateDefinition<ValidStates> {
  return {
    subscribedEvents: ["challenge_step_complete"],
    advance: (_ctx, _data, event) => {
      if (event.kind === "challenge_step_complete" && event.stepId === stepId) {
        return nextState;
      }
    },
  };
}

export function localInv(userId: BiomesId, resources: ClientResources) {
  const inv = resources.get("/ecs/c/inventory", userId);
  if (!inv) {
    return createBag();
  }

  return createBag(
    ...compact([
      ...inv.currencies.values(),
      ...inv.hotbar.values(),
      ...inv.items.values(),
      ...localWearables(userId, resources).values(),
    ])
  );
}

export function localInvHas(
  userId: BiomesId,
  resources: ClientResources,
  bag: ItemBag
) {
  return bagContains(localInv(userId, resources), bag);
}

export function localIsWearing(
  userId: BiomesId,
  resources: ClientResources,
  bag: ItemBag
) {
  return bagContains(localWearables(userId, resources), bag);
}

export function localWearables(userId: BiomesId, resources: ClientResources) {
  const wearing = resources.get("/ecs/c/wearing", userId);
  if (!wearing) {
    return createBag();
  }

  return createBag(
    ...map([...wearing.items.values()], (e): ReadonlyItemAndCount => {
      return countOf(e, 1n);
    })
  );
}
