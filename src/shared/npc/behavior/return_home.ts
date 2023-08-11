import { secondsSinceEpoch } from "@/shared/ecs/config";
import { diffAngle } from "@/shared/math/angles";
import { distSq, distSq2, sub, yaw } from "@/shared/math/linear";
import type { ReadonlyVec2, ReadonlyVec3, Vec2 } from "@/shared/math/types";
import { createCounter } from "@/shared/metrics/metrics";
import type { SimulatedNpc } from "@/shared/npc/simulated";
import { z } from "zod";

const teleportHomeCount = createCounter({
  name: "anima_npc_teleport_home",
  help: "Number of times the NPC was teleported back to their spawn location due to becoming misplaced.",
  labelNames: ["label"],
});

const DISTANCE_EPSILON = 0.1;
const DISTANCE_EPSILON_SQ = DISTANCE_EPSILON * DISTANCE_EPSILON;
const ANGLE_EPSILON = 0.0001;

// How long we'll try to walk home the old fashioned way before we'll just
// teleport instantly back to our home position.
const TELEPORT_WAIT_TIME_SECONDS = 10;

export const zReturnHomeComponent = z.object({
  returnHome: z
    .object({
      lastHomeTime: z.number(),
    })
    .default({ lastHomeTime: -Infinity }),
});
export type ReturnHomeComponent = z.infer<typeof zReturnHomeComponent>;

// Behavior to support ensuring that some NPCs (e.g. quest givers) always return
// back to their spawn position, and orientation.
export function returnHomeTick(npc: SimulatedNpc): {
  forwardSpeed: number;
} {
  const moveResult = moveToDestinationTick(
    npc,
    npc.type.walkSpeed,
    npc.metadata.spawn_orientation,
    npc.metadata.spawn_position
  );

  const now = secondsSinceEpoch();
  if (moveResult.atDestination || !npc.state.returnHome) {
    npc.mutableState().returnHome = {
      lastHomeTime: now,
    };
  } else if (
    now - npc.state.returnHome.lastHomeTime >
    TELEPORT_WAIT_TIME_SECONDS
  ) {
    // If we haven't been able to walk home in a while, just teleport back.
    npc.mutableState().returnHome = undefined;
    npc.setPosition([...npc.metadata.spawn_position]);
    npc.setOrientation([...npc.metadata.spawn_orientation]);
    // Use label instead of type since most return-homers will be "human"s.
    teleportHomeCount.inc({ label: npc.label });
  }

  return moveResult;
}

function moveToDestinationTick(
  npc: SimulatedNpc,
  speed: number,
  targetOrientation: ReadonlyVec2,
  targetPosition: ReadonlyVec3
): {
  atDestination: boolean;
  forwardSpeed: number;
} {
  const curAngle = npc.orientation[1];

  const targetPos2: Vec2 = [targetPosition[0], targetPosition[2]];
  const curPosition = npc.position;
  const curPosition2: Vec2 = [curPosition[0], curPosition[2]];

  // Do we need to move to reposition ourselves?
  if (distSq2(targetPos2, curPosition2) > DISTANCE_EPSILON_SQ) {
    // Figure out the direction to move in, and make sure we're facing that direction
    const targetDir = sub(targetPosition, curPosition);
    const targetAngle = yaw(targetDir);

    if (Math.abs(diffAngle(curAngle, targetAngle)) > ANGLE_EPSILON) {
      // We're not facing the right direction, wait until we are.
      if (npc.state.rotateTarget !== targetAngle) {
        npc.mutableState().rotateTarget = targetAngle;
      }
      return { atDestination: false, forwardSpeed: 0 };
    } else {
      // Move forward towards our target position.
      return { atDestination: false, forwardSpeed: speed };
    }
  } else {
    // Make sure we're facing the intended direction.
    const targetAngle = targetOrientation[1];
    if (Math.abs(diffAngle(curAngle, targetAngle)) > ANGLE_EPSILON) {
      if (npc.state.rotateTarget !== targetAngle) {
        npc.mutableState().rotateTarget = targetAngle;
      }
      return { atDestination: false, forwardSpeed: 0 };
    } else {
      return {
        // Re-evaluate whether we're at the destination in 3D
        atDestination:
          distSq(targetPosition, curPosition) <= DISTANCE_EPSILON_SQ,
        forwardSpeed: 0,
      };
    }
  }
}
