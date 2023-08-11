import type {
  GardenHose,
  GardenHoseEvent,
  GardenHoseEventKind,
} from "@/client/events/api";
import type { ClientContext } from "@/client/game/context";
import type { Events } from "@/client/game/context_managers/events";
import type { ActiveNUX } from "@/client/game/resources/nuxes";
import type { ClientResources } from "@/client/game/resources/types";
import { ALL_NUXES } from "@/client/util/nux/state_machines";
import { SetNUXStatusEvent } from "@/shared/ecs/gen/events";
import type { BiomesId } from "@/shared/ids";
import type { RegistryLoader } from "@/shared/registry";
import { fireAndForget } from "@/shared/util/async";
import { ok } from "assert";
import { entries, isEqual } from "lodash";
import type { ReactNode } from "react";

export type NUXStateMachineId = number;

export interface NUXStateData<ValidStates> {
  id: ValidStates;
  state?: any;
}

export interface ManagedNUXStateData<ValidStates>
  extends NUXStateData<ValidStates> {
  localStartTime: number;
}

export interface NUXStateContext {
  userId: BiomesId;
  resources: ClientResources;
}

export interface NUXRenderable {
  leftItem?: ReactNode;
  rightItem: ReactNode;
}

export interface NUXStateDefinition<ValidStates> {
  subscribedEvents: Array<GardenHoseEventKind>;
  advance: (
    ctx: NUXStateContext,
    data: ManagedNUXStateData<ValidStates>,
    event: GardenHoseEvent
  ) => "complete" | NUXStateData<ValidStates> | undefined;
  effects?: (ctx: NUXStateContext) => (() => unknown) | void;
}

export interface NUXStateMachineDefinition<ValidStates extends string> {
  id: number;
  startState: ValidStates;
  debugState: ValidStates;
  states: { [k in ValidStates]: NUXStateDefinition<ValidStates> };
}

export class NUXManager {
  private nuxStateContext: NUXStateContext;
  private currentStates = new Map<
    NUXStateMachineId,
    ManagedNUXStateData<string> | "complete"
  >();
  private currentStateCleanup = new Map<NUXStateMachineId, () => unknown>();

  private currentListeners = new Map<
    GardenHoseEventKind,
    Set<NUXStateMachineId>
  >();

  private nuxStateMachineById = new Map<
    NUXStateMachineId,
    NUXStateMachineDefinition<string>
  >();
  private nuxStateDefinitionById = new Map<
    string,
    NUXStateDefinition<string>
  >();

  private stopCleanups: Array<() => unknown> = [];

  constructor(
    private userId: BiomesId,
    private resources: ClientResources,
    private events: Events,
    private gardenHose: GardenHose,
    nuxes: NUXStateMachineDefinition<string>[]
  ) {
    this.nuxStateContext = {
      userId,
      resources,
    };

    const nuxStatus = this.resources.get(
      "/ecs/c/player_status",
      this.userId
    )?.nux_status;

    for (const nux of nuxes) {
      ok(!this.nuxStateMachineById.has(nux.id), "Duplicate state!");
      this.nuxStateMachineById.set(nux.id, nux);
      for (const [stateDefId, stateDef] of entries(nux.states)) {
        ok(!this.nuxStateDefinitionById.has(stateDefId), "Duplicate state!");
        this.nuxStateDefinitionById.set(stateDefId, stateDef);
      }

      const persistedStatus = nuxStatus?.get(nux.id);
      if (
        persistedStatus &&
        (persistedStatus.complete ||
          nux.states[persistedStatus.state_id] !== undefined)
      ) {
        if (persistedStatus.complete) {
          this.setCurrentState(nux.id, "complete", false);
        } else {
          this.setCurrentState(nux.id, { id: persistedStatus.state_id }, false);
        }
      } else {
        this.setCurrentState(nux.id, { id: nux.startState }, false);
      }
    }

    this.invalidateResources();

    const cb = (event: GardenHoseEvent) => {
      this.onGardenHoseEvent(event);
    };

    this.gardenHose.on("anyEvent", cb);
    this.stopCleanups.push(() => {
      this.gardenHose.off("anyEvent", cb);
    });
  }

  stop() {
    while (this.stopCleanups.length > 0) {
      this.stopCleanups.pop()!();
    }
  }

  nuxWithStates() {
    return [...this.currentStates.entries()];
  }

  resetNUX(
    stateMachineId: NUXStateMachineId,
    toState: "start" | "debug" | "complete"
  ) {
    const sm = this.nuxStateMachineById.get(stateMachineId);
    ok(sm);

    let stateMachineState: NUXStateData<string> | "complete";
    switch (toState) {
      case "start":
        stateMachineState = {
          id: sm.startState,
        };
        break;
      case "debug":
        stateMachineState = {
          id: sm.debugState,
        };
        break;
      case "complete":
        stateMachineState = "complete";
        break;
    }

    this.setCurrentState(stateMachineId, stateMachineState, true);
    this.invalidateResources();
  }

  private onGardenHoseEvent(event: GardenHoseEvent) {
    const listeners = this.currentListeners.get(event.kind);
    let changed = false;
    if (listeners) {
      for (const stateMachineId of [...listeners]) {
        const currentStateData = this.currentStates.get(stateMachineId);
        if (currentStateData === "complete" || !currentStateData) {
          continue;
        }
        const currentStateDefinition = this.nuxStateDefinitionById.get(
          currentStateData.id
        );
        ok(currentStateDefinition, "Invalid state!");

        const newState = currentStateDefinition.advance(
          this.nuxStateContext,
          currentStateData,
          event
        );

        if (!newState) {
          continue;
        }

        changed = true;
        this.setCurrentState(stateMachineId, newState, true);

        if (newState === "complete") {
          this.onGardenHoseEvent({
            kind: "nux_complete",
            id: stateMachineId,
          });
        }
      }
    }

    if (changed) {
      this.invalidateResources();
    }
  }

  invalidateResources() {
    const activeNuxes: ActiveNUX[] = [];
    for (const [machineId, stateData] of this.currentStates) {
      if (stateData === "complete") {
        continue;
      }

      // Don't ever render the start state
      if (
        this.nuxStateMachineById.get(machineId)!.startState === stateData.id
      ) {
        continue;
      }

      const stateDefinition = this.nuxStateDefinitionById.get(stateData.id);
      ok(stateDefinition);

      activeNuxes.push({
        nuxId: machineId,
        stateId: stateData.id,
      });
    }

    if (
      !isEqual(this.resources.get("/nuxes/state_active").value, activeNuxes)
    ) {
      this.resources.set("/nuxes/state_active", { value: activeNuxes });
    }
  }

  private setCurrentState(
    stateMachineId: NUXStateMachineId,
    data: NUXStateData<string> | "complete",
    persist: boolean
  ) {
    const currentStateDef = this.currentStates.get(stateMachineId);
    if (currentStateDef && currentStateDef !== "complete") {
      this.removeListenersForStateDef(
        stateMachineId,
        this.nuxStateDefinitionById.get(currentStateDef.id)!
      );

      // Handle cleanup from prior effects
      this.currentStateCleanup.get(stateMachineId)?.();
      this.currentStateCleanup.delete(stateMachineId);
    }

    if (data !== "complete") {
      const newStateDefinition = this.nuxStateDefinitionById.get(data.id)!;
      this.addListenersForStateDef(stateMachineId, newStateDefinition);

      // Add call effect with cleanup
      if (newStateDefinition?.effects) {
        const res = newStateDefinition.effects(this.nuxStateContext);
        if (res) {
          this.currentStateCleanup.set(stateMachineId, res);
        }
      }
      this.currentStates.set(stateMachineId, {
        ...data,
        localStartTime: performance.now(),
      });
    } else {
      this.currentStates.set(stateMachineId, "complete");
    }

    if (persist) {
      fireAndForget(
        this.events.publish(
          new SetNUXStatusEvent({
            id: this.userId,
            nux_id: stateMachineId,
            status:
              data === "complete"
                ? {
                    state_id: "complete",
                    complete: true,
                  }
                : {
                    state_id: data.id,
                    complete: false,
                  },
          })
        )
      );
    }
  }

  private removeListenersForStateDef(
    stateMachineId: NUXStateMachineId,
    stateDef: NUXStateDefinition<string>
  ) {
    for (const listened of stateDef.subscribedEvents) {
      this.currentListeners.get(listened)?.delete(stateMachineId);
    }
  }

  private addListenersForStateDef(
    stateMachineId: NUXStateMachineId,
    stateDef: NUXStateDefinition<string>
  ) {
    for (const listened of stateDef.subscribedEvents) {
      const s = this.currentListeners.get(listened);
      if (s) {
        s.add(stateMachineId);
      } else {
        this.currentListeners.set(listened, new Set([stateMachineId]));
      }
    }
  }
}

export async function loadNuxManager(loader: RegistryLoader<ClientContext>) {
  const [userId, resources, events, gardenHose] = await Promise.all([
    loader.get("userId"),
    loader.get("resources"),
    loader.get("events"),
    loader.get("gardenHose"),
  ]);

  return new NUXManager(
    userId,
    resources,
    events,
    gardenHose,
    ALL_NUXES as NUXStateMachineDefinition<string>[]
  );
}
