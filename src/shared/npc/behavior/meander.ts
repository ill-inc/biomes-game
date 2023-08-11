// Logic shared by all muckers.

import { secondsSinceEpoch } from "@/shared/ecs/config";
import { normalizeAngle } from "@/shared/math/angles";
import { lengthSq, normalizev, pitchAndYaw, sub } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { isSafeZone } from "@/shared/npc/behavior/common";
import type { Environment } from "@/shared/npc/environment";
import type { SimulatedNpc } from "@/shared/npc/simulated";
import { ok } from "assert";
import { z } from "zod";

export const zMeanderComponent = z.object({
  meander: z
    .object({
      nextRotateSecs: z.number(),
    })
    .default({ nextRotateSecs: 0 }),
});
export type MeanderComponent = z.infer<typeof zMeanderComponent>;

function randomInRange(range: [number, number]) {
  return Math.random() * (range[1] - range[0]) + range[0];
}

// The angular distance from the home point the NPC will meander
// randomly within. The smaller it is, the more precisely they
// will return home.
const RETURN_APPROX_ANGLE_RANGE = Math.PI / 2;

export function meanderTick(
  env: Environment,
  npc: SimulatedNpc,
  stayNearPoint: ReadonlyVec3
): {
  forwardSpeed: number;
} {
  ok(npc.type.behavior.meander);
  const params = npc.type.behavior.meander;

  if (!npc.state.meander) {
    npc.mutableState().meander =
      zMeanderComponent.shape.meander.parse(undefined);
    ok(npc.state.meander);
  }

  // Setup some random rotations for the NPC to do.
  const now = secondsSinceEpoch();
  const newRotateTime = () => now + randomInRange([4, 12]);
  if (npc.state.meander.nextRotateSecs === undefined) {
    npc.mutableState().meander!.nextRotateSecs = newRotateTime();
  }
  if (npc.state.meander.nextRotateSecs < now) {
    npc.mutableState().meander!.nextRotateSecs = newRotateTime();
    npc.mutableState().rotateTarget = Math.random() * Math.PI * 2;
    if (params.stayDistanceFromSpawn) {
      const toHome = sub(stayNearPoint, npc.position);
      const distToHomeSq = lengthSq(toHome);
      if (
        // If we've moved too far from our home point, head back.
        distToHomeSq > params.stayDistanceFromSpawn ** 2 ||
        // If we're an aggressive NPC in a safe zone, head out of it.
        (npc.type.behavior.chaseAttack &&
          isSafeZone(
            env.voxeloo,
            npc.position,
            env.ecsMetaIndex,
            env.resources
          ))
      ) {
        // Head in the direction of home (where we spawned).
        const dirToHome = normalizev(toHome);
        let newRotateTarget = pitchAndYaw(dirToHome)[1];

        // Add a bit of randomness to the rotation angle.
        const jitter = (Math.random() - 0.5) * RETURN_APPROX_ANGLE_RANGE;
        newRotateTarget = normalizeAngle(newRotateTarget + jitter);

        npc.mutableState().rotateTarget = newRotateTarget;
      }
    }
  }

  const walkTime = (npc.id % 3) - 1 + 6;
  return {
    forwardSpeed: npc.type.walkSpeed * (Math.floor(now / walkTime) % 2),
  };
}
