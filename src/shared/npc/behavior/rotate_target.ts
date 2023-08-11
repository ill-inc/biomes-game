// Logic shared by all muckers.

import { degToRad, diffAngle, normalizeAngle } from "@/shared/math/angles";
import type { SimulatedNpc } from "@/shared/npc/simulated";
import { z } from "zod";

export const zRotateTargetComponent = z.object({
  rotateTarget: z.number(),
});

export function rotateTargetTick(
  npc: SimulatedNpc,
  degsPerSec: number,
  dtSecs: number
) {
  // Apply logic to turn the NPC towards its rotation target.
  if (npc.state.rotateTarget === undefined) {
    return;
  }

  const orientation = npc.orientation;
  let rotateDiff = diffAngle(npc.state.rotateTarget, orientation[1]);
  const maxRadsInTick = degToRad(degsPerSec) * dtSecs;
  if (rotateDiff > maxRadsInTick || rotateDiff < -maxRadsInTick) {
    rotateDiff = Math.min(maxRadsInTick, Math.max(-maxRadsInTick, rotateDiff));
  } else {
    // Last tick for rotation!
    delete npc.mutableState().rotateTarget;
  }

  npc.setOrientation([
    orientation[0],
    normalizeAngle(rotateDiff + orientation[1]),
  ]);
}
