import { secondsSinceEpoch } from "@/shared/ecs/config";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { CollisionHelper } from "@/shared/game/collision";
import {
  add,
  anchorAndSizeToAABB,
  containsAABB,
  normalizev,
  pitchAndYaw,
  scale,
} from "@/shared/math/linear";
import type { AABB, ReadonlyVec3 } from "@/shared/math/types";
import {
  chaseAttackTargetTick,
  updateAttackTarget,
} from "@/shared/npc/behavior/chase_attack";
import { drownTick } from "@/shared/npc/behavior/drown";
import { farFromHomeTick } from "@/shared/npc/behavior/far_from_home";
import { flyTick } from "@/shared/npc/behavior/fly";
import { meanderTick } from "@/shared/npc/behavior/meander";
import { returnHomeTick } from "@/shared/npc/behavior/return_home";
import { rotateTargetTick } from "@/shared/npc/behavior/rotate_target";
import { socializeTick } from "@/shared/npc/behavior/socialize";
import { swimTick } from "@/shared/npc/behavior/swim";
import { getMovementTypeByNpcType, npcGlobals } from "@/shared/npc/bikkie";
import type { Environment } from "@/shared/npc/environment";
import type { MovementType } from "@/shared/npc/npc_types";
import type { SimulatedNpc } from "@/shared/npc/simulated";
import {
  DEFAULT_ENVIRONMENT_PARAMS,
  NPC_FLYING_ENVIRONMENT_PARAMS,
  NPC_SWIMMING_ENVIRONMENT_PARAMS,
} from "@/shared/physics/environments";
import {
  addForce,
  forwardWalkingForce,
  nullForce,
} from "@/shared/physics/forces";
import { moveBodyFluid, moveBodyWithClimbing } from "@/shared/physics/movement";
import type { Force, HitFn } from "@/shared/physics/types";
import { toClimbableIndex } from "@/shared/physics/utils";
import _ from "lodash";

// The tick context that drives most of the NPCs based on their data-driven
// behavioral definitions.
export function npcTickLogic(
  env: Environment,
  npc: SimulatedNpc,
  dtSecs: number
) {
  if (npc.lockedInPlace) {
    // Currently this primarily applies for robots, but if they are locked
    // in place, then we will not apply any physics at all to them.
    return;
  }

  if (
    !containsAABB(
      [env.worldMetadata.aabb.v0, env.worldMetadata.aabb.v1],
      npc.position
    )
  ) {
    npc.kill({ kind: "npc", type: { kind: "outOfWorldBounds" } });
    return;
  }

  if (npc.type.behavior.chaseAttack) {
    updateAttackTarget(env, npc, npc.type.behavior.chaseAttack);
  }

  let forwardSpeed = 0;
  const homePoint: ReadonlyVec3 = npc.metadata.spawn_position;

  let force = nullForce;

  if (npc.type.behavior.swim) {
    force = addForce(force, swimTick(env, npc).force);
  } else if (npc.type.behavior.fly) {
    force = addForce(force, flyTick(env, npc).force);
  } else if (npc.questGiver) {
    // We want to make sure that quest givers always stay in the position
    // they were spawned in.
    forwardSpeed = returnHomeTick(npc).forwardSpeed;
  } else if (
    npc.type.behavior.chaseAttack &&
    npc.state.chaseAttack?.attackTarget
  ) {
    ({ forwardSpeed } = chaseAttackTargetTick(
      env,
      npc,
      npc.type.behavior.chaseAttack
    ));
  } else if (npc.type.behavior.meander) {
    const meanderOutput = meanderTick(env, npc, homePoint);
    forwardSpeed = meanderOutput.forwardSpeed;
  } else if (npc.type.behavior.socialize) {
    forwardSpeed = socializeTick(
      env,
      npc,
      homePoint,
      npc.type.behavior.socialize
    ).forwardSpeed;
  }
  // Compute the NPC's AABB which is needed for physics and drowning logic.
  const aabb = anchorAndSizeToAABB(npc.position, npc.size);

  rotateTargetTick(npc, npc.type.rotateSpeed, dtSecs);

  if (npc.type.behavior.damageable) {
    drownTick(env.resources, npc, aabb, {
      breathingType: npc.type.behavior.swim ? "water" : "air",
    });
  }

  const lastDamageForce = (() => {
    if (!npc.type.behavior.damageable) {
      return undefined;
    }
    const health = npc.health;
    if (
      health.lastDamageSource?.kind !== "attack" ||
      health.lastDamageSource.dir === undefined ||
      !health.lastDamageTime
    ) {
      return undefined;
    }

    if (
      npc.state.damageReaction?.lastReactionTime &&
      health.lastDamageTime <= npc.state.damageReaction.lastReactionTime
    ) {
      return undefined;
    }

    return health.lastDamageSource.dir;
  })();

  if (lastDamageForce) {
    npc.mutableState().damageReaction = {
      lastReactionTime: Math.min(
        npc.health.lastDamageTime!,
        secondsSinceEpoch()
      ),
    };
  }

  const walkingForce = forwardWalkingForce(forwardSpeed, npc.orientation[1]);

  force = addForce(force, walkingForce);

  applyNpcPhysics({
    env,
    npc,
    dtSecs,
    aabb,
    lastDamageForce,
    force,
    movementType: getMovementTypeByNpcType(npc.type),
  });

  if (npc.type.behavior.meander?.stayDistanceFromSpawn) {
    // If the NPC is far from its home for more than 5 minutes, it will
    // expire.
    const FAR_FROM_HOME_SECONDS_BEFORE_EXPIRE = 2 * 60;
    farFromHomeTick(
      npc,
      homePoint,
      FAR_FROM_HOME_SECONDS_BEFORE_EXPIRE,
      npc.type.behavior.meander.stayDistanceFromSpawn
    );
  }
}

function applyNpcPhysics({
  env,
  npc,
  dtSecs,
  aabb,
  lastDamageForce,
  force,
  movementType,
}: {
  env: Environment;
  npc: SimulatedNpc;
  dtSecs: number;
  aabb: AABB;
  lastDamageForce: ReadonlyVec3 | undefined;
  force: Force;
  movementType: MovementType;
}) {
  const metadata = env.resources.get("/ecs/metadata");
  // Define the intersection testing routine.
  const collisionIndex = ([v0, v1]: AABB, fn: HitFn) => {
    CollisionHelper.intersect(
      (id) => env.resources.get("/physics/boxes", id),
      env.table,
      metadata,
      [v0, v1],
      (hit: AABB, entity?: ReadonlyEntity) => {
        // Avoid self-intersections.
        if (!entity || entity.id !== npc.id) {
          return fn(hit);
        }
      }
    );
  };

  // Define a routine to test if an NPC can climb on collision.
  const climbableIndex = toClimbableIndex(collisionIndex);

  const forces = [force];
  const globals = npcGlobals();

  if (lastDamageForce) {
    const velocityDiff = scale(
      globals.knockback.force,
      normalizev(lastDamageForce)
    );

    // Pop the NPC up into the air a bit when it gets hit.
    velocityDiff[1] = globals.knockback.popup;

    forces.push(() => velocityDiff);
  }

  // Run a physics step to compute the NPCs new position and momentum.
  const result =
    movementType === "swimming" || movementType === "flying"
      ? moveBodyFluid(
          dtSecs,
          { aabb, velocity: npc.velocity },
          collisionIndex,
          [force],
          movementType === "swimming"
            ? NPC_SWIMMING_ENVIRONMENT_PARAMS
            : NPC_FLYING_ENVIRONMENT_PARAMS
        )
      : moveBodyWithClimbing(
          dtSecs,
          { aabb: aabb, velocity: [...npc.velocity] },
          { ...DEFAULT_ENVIRONMENT_PARAMS, gravity: globals.gravity },
          collisionIndex,
          climbableIndex,
          forces,
          []
        );

  if (movementType === "swimming" || movementType === "flying") {
    npc.setOrientation(pitchAndYaw(npc.velocity));
  }

  if (!_.isEqual(result.movement.impulse, [0, 0, 0])) {
    npc.setPosition(add(npc.position, result.movement.impulse));
  }
  if (!_.isEqual(result.movement.velocity, npc.velocity)) {
    npc.setVelocity([...result.movement.velocity]);
  }
}
