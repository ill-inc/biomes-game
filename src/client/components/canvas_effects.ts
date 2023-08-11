import type { ClientResources } from "@/client/game/resources/types";
import { ok } from "assert";
import { uniqueId } from "lodash";

export interface WorldLoadEffect {
  kind: "worldLoad";
  onComplete: () => unknown;
}

export interface WakeUpEffect {
  kind: "wakeUp";
  onComplete: () => unknown;
}

export interface WarpEffect {
  kind: "warp";
  onBeginningFinished: () => unknown;
  substate: "beginning" | "ending";
  substateTime: number;
  hasFiredBeginningFinished: boolean;
  fromBw: boolean;
}

export interface TVStaticEffect {
  kind: "tvStatic";
}

export type CanvasEffect =
  | {
      kind: "none";
    }
  | WorldLoadEffect
  | WakeUpEffect
  | WarpEffect
  | {
      kind: "bw";
    };

export function setCanvasEffect(
  resources: ClientResources,
  effect: CanvasEffect
) {
  const id = uniqueId();
  resources.set("/canvas_effect", {
    id,
    ...effect,
  });
  return id;
}

export function removeCanvasEffectOfId(resources: ClientResources, id: string) {
  if (resources.get("/canvas_effect").id === id) {
    resources.set("/canvas_effect", {
      id: uniqueId(),
      kind: "none",
    });
  }
}

export function removeCanvasEffect(resources: ClientResources) {
  resources.set("/canvas_effect", {
    id: uniqueId(),
    kind: "none",
  });
}

export function finishWarpEffect(resources: ClientResources) {
  if (resources.get("/canvas_effect").kind !== "warp") {
    return;
  }
  resources.update("/canvas_effect", (c) => {
    ok(c.kind === "warp");
    c.substate = "ending";
    c.substateTime = performance.now();
  });
}

export function beginOrUpdateWarpEffect(
  resources: ClientResources,
  beginningFinished?: () => unknown
) {
  const fromBw = resources.get("/canvas_effect").kind === "bw";
  if (resources.get("/canvas_effect").kind === "warp") {
    resources.update("/canvas_effect", (c) => {
      ok(c.kind === "warp");
      if (beginningFinished) {
        c.hasFiredBeginningFinished = false;
        c.onBeginningFinished = beginningFinished;
      }
    });
  } else {
    setCanvasEffect(resources, {
      kind: "warp",
      hasFiredBeginningFinished: false,
      substate: "beginning",
      substateTime: performance.now(),
      onBeginningFinished: beginningFinished ?? (() => {}),
      fromBw,
    });
  }
}
