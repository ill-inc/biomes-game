import type { GardenHose } from "@/client/events/api";
import type { ClientContext } from "@/client/game/context";
import type { TriggerProgress } from "@/client/game/resources/challenges";
import type {
  ClientReactResources,
  ClientResourcePaths,
} from "@/client/game/resources/types";
import type { Bundle, Key, Ret } from "@/client/resources/react";
import { EmitterScope } from "@/shared/events";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import type { Args } from "@/shared/resources/types";
import { difference } from "lodash";

export class ResourcesPipeToGardenHose {
  private readonly scope: EmitterScope;
  private previousChallengeStepProgress = new Map<BiomesId, number>();

  constructor(
    private readonly userId: BiomesId,
    private readonly reactResources: ClientReactResources,
    private readonly gardenHose: GardenHose
  ) {
    this.scope = new EmitterScope(reactResources.emitter);
    gardenHose.publish({ kind: "bootstrap" });
    this.subscribeToAutomaticEvents();
  }

  hotHandoff(old: ResourcesPipeToGardenHose) {
    old.stop();
  }

  stop() {
    this.scope.off();
  }

  private onResourceDelta<K extends Key<ClientResourcePaths>>(
    cb: (r: Ret<ClientResourcePaths, K>) => unknown,
    path: K,
    ...args: [...Args<ClientResourcePaths, K>]
  ) {
    let baseInventoryVersion = this.reactResources.version(path, ...args);
    const wrappedCb = () => {
      const newVersion = this.reactResources.version(path, ...args);
      if (newVersion !== baseInventoryVersion) {
        baseInventoryVersion = newVersion;
        cb(this.reactResources.get(path, ...args));
      }
    };
    const key = this.reactResources.key([
      path,
      ...args,
    ] as unknown as Bundle<ClientResourcePaths>);
    return this.scope.on(key, wrappedCb);
  }

  private subscribeToAutomaticEvents() {
    // TODO: we should use general infrastructure for this instead, currently the only
    //       emitter for resources in through this react resources structure, which requires
    //       manual inspection of version.
    this.onResourceDelta(
      () => {
        this.gardenHose.publish({
          kind: "inventory_change",
        });
      },
      "/ecs/c/inventory",
      this.userId
    );

    this.onResourceDelta(() => {
      this.gardenHose.publish({
        kind: "selection_change",
      });
    }, "/hotbar/selection");

    this.onResourceDelta(() => {
      this.gardenHose.publish({
        kind: "local_inventory_selection_change",
      });
    }, "/hotbar/selection");

    let lastInWater = false;
    this.onResourceDelta(
      (e) => {
        if (e.inWater && !lastInWater) {
          this.gardenHose.publish({
            kind: "enter_water",
          });
        }
        lastInWater = e.inWater;
      },
      "/players/environment/water",
      this.userId
    );

    let lastHealth: number = -10;
    this.onResourceDelta(
      (e) => {
        if (!e) {
          return;
        }
        if (e.hp < lastHealth) {
          this.gardenHose.publish({
            kind: "take_damage",
            damageSource: e.lastDamageSource,
          });
        }
        if (e.hp <= 0) {
          this.gardenHose.publish({
            kind: "die",
            damageSource: e.lastDamageSource,
          });
        }
        lastHealth = e.hp;
      },
      "/ecs/c/health",
      this.userId
    );

    const lastCount = [0];
    this.onResourceDelta(
      (e) => {
        if (!e) {
          return;
        }

        if (e.overflow.size > lastCount[0]) {
          this.gardenHose.publish({
            kind: "inventory_overflow_item_received",
          });
        }
        lastCount[0] = e.overflow.size;
      },
      "/ecs/c/inventory",
      this.userId
    );

    this.subscribeAutomaticChallengeTrackerEvents();
  }

  private subscribeAutomaticChallengeTrackerEvents() {
    const startChallenges = this.reactResources.get(
      "/ecs/c/challenges",
      this.userId
    );
    let lastChallengeComplete = [...(startChallenges?.complete ?? [])];
    let lastChallengeInProgress = [...(startChallenges?.in_progress ?? [])];
    this.onResourceDelta(
      (challenges) => {
        const nowComplete = [...(challenges?.complete ?? [])];
        const nowInProgress = [...(challenges?.in_progress ?? [])];
        const newComplete = difference(nowComplete, lastChallengeComplete);
        const newStart = difference(nowInProgress, lastChallengeInProgress);
        const newAbandon = difference(
          difference(lastChallengeInProgress, nowInProgress),
          nowComplete
        );
        for (const c of newComplete) {
          this.gardenHose.publish({
            kind: "challenge_complete",
            id: c,
          });
        }

        for (const c of newStart) {
          this.gardenHose.publish({
            kind: "challenge_unlock",
            id: c,
          });
        }

        for (const c of newAbandon) {
          this.gardenHose.publish({
            kind: "challenge_abandon",
            id: c,
          });
        }

        lastChallengeComplete = nowComplete;
        lastChallengeInProgress = nowInProgress;
      },
      "/ecs/c/challenges",
      this.userId
    );

    this.previousChallengeStepProgress = new Map<BiomesId, number>();
    const recursiveDelete = (progress: TriggerProgress) => {
      this.previousChallengeStepProgress.delete(progress.id);
      for (const child of progress.children ?? []) {
        recursiveDelete(child);
      }
    };

    const recursiveTrack = (
      progress: TriggerProgress,
      isActiveStep: boolean,
      bootstrap: boolean
    ) => {
      const prevVal = this.previousChallengeStepProgress.get(progress.id);
      if (!bootstrap && progress.progressPercentage !== prevVal) {
        if (prevVal === undefined) {
          if (isActiveStep) {
            this.gardenHose.publish({
              kind: "challenge_step_begin",
              triggerProgress: progress,
              stepId: progress.id,
            });
          }
        } else if (progress.progressPercentage >= 1.0) {
          this.gardenHose.publish({
            kind: "challenge_step_complete",
            triggerProgress: progress,
            stepId: progress.id,
          });
        } else {
          if (isActiveStep) {
            this.gardenHose.publish({
              kind: "challenge_step_progress",
              previousProgress: prevVal,
              triggerProgress: progress,
              progress: progress.progressPercentage,
              stepId: progress.id,
            });
          } else {
            log.warn(
              `Received progress for inactive step ${progress.id}, skipping progress messag`,
              {
                prevVal,
                currentProgress: progress.progressPercentage,
                name: progress.name,
              }
            );
          }
        }
      }

      if (isActiveStep || progress.progressPercentage > 0) {
        this.previousChallengeStepProgress.set(
          progress.id,
          progress.progressPercentage
        );
      }

      let couldBeActiveStep = isActiveStep && progress.progressPercentage < 1.0;
      for (const child of progress.children ?? []) {
        recursiveTrack(
          child,
          couldBeActiveStep && child.progressPercentage < 1.0,
          bootstrap
        );
        if (progress.payload.kind === "seq" && child.progressPercentage < 1.0) {
          couldBeActiveStep = false;
        }
      }
    };

    const isProgressBootstrap = [true];
    const previousInProgressRoots = new Set<BiomesId>();
    this.onResourceDelta(
      (e) => {
        if (!e?.by_root) {
          return;
        }

        const challengeState = this.reactResources.get(
          "/ecs/c/challenges",
          this.userId
        );

        const newInProgressRoots = [] as Array<BiomesId>;
        for (const [id] of e.by_root) {
          const isInProgress = challengeState?.in_progress.has(id);
          const isNewlyInProgress =
            isInProgress && !previousInProgressRoots.has(id);
          const isNewlyComplete =
            !isProgressBootstrap[0] &&
            challengeState?.complete.has(id) &&
            this.previousChallengeStepProgress.has(id) &&
            this.previousChallengeStepProgress.get(id)! < 1.0;

          if (!isInProgress && !isNewlyComplete) {
            continue;
          }

          if (isInProgress) {
            newInProgressRoots.push(id);
          }

          const questBundle = this.reactResources.get("/quest", id);
          if (questBundle?.progress) {
            if (isNewlyInProgress) {
              // If this is the first time seing it, clear all previous state we had (admin swapping)
              recursiveDelete(questBundle.progress);
            }
            recursiveTrack(
              questBundle.progress,
              questBundle.progress.progressPercentage < 1.0,
              isProgressBootstrap[0]
            );
          }
        }

        previousInProgressRoots.clear();
        for (const e of newInProgressRoots) {
          previousInProgressRoots.add(e);
        }

        isProgressBootstrap[0] = false;
      },
      "/ecs/c/trigger_state",
      this.userId
    );
  }
}

export async function loadResourcesPipeToGardenHose(
  loader: RegistryLoader<ClientContext>
) {
  const [userId, gardenHose, reactResources] = await Promise.all([
    loader.get("userId"),
    loader.get("gardenHose"),
    loader.get("reactResources"),
  ]);
  return new ResourcesPipeToGardenHose(userId, reactResources, gardenHose);
}
