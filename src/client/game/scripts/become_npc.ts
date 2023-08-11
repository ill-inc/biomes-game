import type { ClientContextSubset } from "@/client/game/context";
import type { Events } from "@/client/game/context_managers/events";
import type { ClientInput } from "@/client/game/context_managers/input";
import type { PermissionsManager } from "@/client/game/context_managers/permissions_manager";
import type { ClientTable } from "@/client/game/game";
import { allAabbShardsLoaded } from "@/client/game/helpers/player_shards";
import type { ClientResources } from "@/client/game/resources/types";
import type { Script } from "@/client/game/scripts/script_controller";
import { invalidPlacementReason } from "@/client/game/util/robots";
import {
  EndPlaceRobotEvent,
  SetNPCPositionEvent,
} from "@/shared/ecs/gen/events";
import type { CollisionCallback } from "@/shared/game/collision";
import { CollisionHelper } from "@/shared/game/collision";
import { getAabbForEntity } from "@/shared/game/entity_sizes";
import type { BiomesId } from "@/shared/ids";
import { add, approxEquals, approxEquals2 } from "@/shared/math/linear";
import type { ReadonlyVec2, ReadonlyVec3, Vec2 } from "@/shared/math/types";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { GROUP_PLACEMENT_ENVIRONMENT_PARAMS } from "@/shared/physics/environments";
import { verticalForce, walkingForce } from "@/shared/physics/forces";
import { moveBodySimple } from "@/shared/physics/movement";
import type { CollisionIndex, Force } from "@/shared/physics/types";
import { grounded } from "@/shared/physics/utils";
import { fireAndForget } from "@/shared/util/async";
import { EventThrottle, StateThrottle } from "@/shared/util/throttling";
import { ok } from "assert";

type MoveState = {
  position: ReadonlyVec3;
  orientation: ReadonlyVec2;
};

export interface BecomeOptions {
  onRevert?: () => void;
  onCommit?: () => void;
}

export async function becomeTheNPC(
  deps: ClientContextSubset<"events" | "userId" | "resources">,
  entityId: BiomesId,
  becomeOptions: BecomeOptions = {}
) {
  const npc = deps.resources.get("/ecs/entity", entityId);
  if (!npc || !npc.position?.v) {
    return;
  }

  deps.resources.set("/scene/npc/become_npc", {
    kind: "active",
    entityId,
    position: [...npc.position.v],
    orientation: [...(npc.orientation?.v ?? [0, 0])],
    velocity: [...(npc.rigid_body?.velocity ?? [0, 0, 0])],
    onRevert: becomeOptions.onRevert,
    onCommit: becomeOptions.onCommit,
  });
}

async function commitBecomeTheNPCPosition(
  deps: ClientContextSubset<"events" | "userId" | "resources">,
  orientationOverride?: Vec2
) {
  const becomeNPC = deps.resources.get("/scene/npc/become_npc");
  ok(becomeNPC.kind === "active");

  const entity = deps.resources.get("/ecs/entity", becomeNPC.entityId);

  await deps.events.publish(
    new SetNPCPositionEvent({
      id: deps.userId,
      entity_id: becomeNPC.entityId,
      orientation: orientationOverride
        ? orientationOverride
        : becomeNPC.orientation,
      position: becomeNPC.position,
      update_spawn: true,
    })
  );

  if (entity?.robot_component) {
    await deps.events.publish(
      new EndPlaceRobotEvent({
        id: deps.userId,
        robot_entity_id: becomeNPC.entityId,
        orientation: orientationOverride
          ? orientationOverride
          : becomeNPC.orientation,
        position: becomeNPC.position,
      })
    );
  }
  becomeNPC.onCommit?.();
}

export async function revertBecomeTheNPC(
  deps: ClientContextSubset<"events" | "userId" | "resources">
) {
  const becomeNPC = deps.resources.get("/scene/npc/become_npc");
  ok(becomeNPC.kind === "active");
  const entity = deps.resources.get("/ecs/entity", becomeNPC.entityId);

  await deps.events.publish(
    new SetNPCPositionEvent({
      id: deps.userId,
      entity_id: becomeNPC.entityId,
      orientation: entity?.npc_metadata?.spawn_orientation,
      position: entity?.npc_metadata?.spawn_position,
      update_spawn: false,
    })
  );

  becomeNPC.onRevert?.();

  deps.resources.set("/scene/npc/become_npc", {
    kind: "empty",
  });
}

export async function stopBecomingTheNPC(
  deps: ClientContextSubset<"events" | "userId" | "resources">,
  orientationOverride?: Vec2
) {
  const becomeNPC = deps.resources.get("/scene/npc/become_npc");
  if (becomeNPC.kind === "empty") {
    return;
  }

  await commitBecomeTheNPCPosition(deps, orientationOverride);

  deps.resources.set("/scene/npc/become_npc", {
    kind: "empty",
  });
}

export class BecomeNPCScript implements Script {
  readonly name = "becomeNpc";

  // A throttle to prevent sending
  private previewUpdatePositionThrottle = new StateThrottle(
    {
      position: [0, 0, 0],
      orientation: [0, 0],
    } as MoveState,
    (prev, { position, orientation }: MoveState) => {
      return {
        state: { position, orientation },
        allow:
          !approxEquals(position, prev.position) ||
          !approxEquals2(orientation, prev.orientation),
      };
    }
  );

  private previewUpdateEventThrottle = new EventThrottle(100);

  constructor(
    readonly input: ClientInput,
    readonly resources: ClientResources,
    readonly table: ClientTable,
    readonly events: Events,
    readonly permissionsManager: PermissionsManager,
    readonly userId: BiomesId,
    readonly tweaks = resources.get("/tweaks")
  ) {}

  private makeCollisionIndex(): CollisionIndex {
    const becomeNPCState = this.resources.get("/scene/npc/become_npc");
    if (becomeNPCState.kind !== "active") {
      return () => {};
    }
    return ([v0, v1], fn) => {
      const ignoreSelfFn: CollisionCallback = (aabb, entity) => {
        if (!entity || entity.id !== becomeNPCState.entityId) {
          return fn(aabb);
        }
      };
      CollisionHelper.intersect(
        (id) => this.resources.get("/physics/boxes", id),
        this.table,
        this.resources.get("/ecs/metadata"),
        [v0, v1],
        ignoreSelfFn
      );
    };
  }

  aabb() {
    const becomeNPCState = this.resources.get("/scene/npc/become_npc");
    ok(becomeNPCState.kind === "active");
    return (
      getAabbForEntity(this.activeEntity, {
        motionOverrides: becomeNPCState,
      }) ?? [
        [0, 0, 0],
        [1, 1, 1],
      ]
    );
  }

  get activeEntity() {
    const becomeNPCState = this.resources.get("/scene/npc/become_npc");
    ok(becomeNPCState.kind === "active");
    const entity = this.resources.get("/ecs/entity", becomeNPCState.entityId);
    ok(entity);
    return entity;
  }

  handlePhysics(dt: number) {
    const becomeNPCState = this.resources.get("/scene/npc/become_npc");
    if (becomeNPCState.kind === "empty") {
      return;
    }

    // Don't run physics if shard boxes aren't loaded.
    if (!allAabbShardsLoaded(this.resources, this.aabb())) {
      return;
    }

    const becomeNPCStateEcs = this.resources.get(
      "/ecs/entity",
      becomeNPCState.entityId
    );
    if (!becomeNPCStateEcs) {
      return;
    }

    const aabb = this.aabb();

    const forward = Math.sign(this.input.motion("forward")) as -1 | 0 | 1;
    const lateral = Math.sign(this.input.motion("lateral")) as -1 | 0 | 1;
    const forces: Force[] = [];

    const speed =
      // Moving backwards is slower.
      (forward < 0
        ? this.tweaks.playerPhysics.reverse
        : this.tweaks.playerPhysics.forward) *
      // Moving sideways is slower.
      (lateral === 0 ? 1 : this.tweaks.playerPhysics.lateralMultiplier);

    // Figure out what direction the player is moving.
    const [_pitch, yaw] = becomeNPCState.orientation;

    if (forward || lateral) {
      forces.push(walkingForce(speed, yaw, forward, lateral));
    }

    if (this.input.action("jump")) {
      const onGround = grounded(this.makeCollisionIndex(), aabb);

      if (onGround) {
        forces.push(verticalForce(this.tweaks.playerPhysics.groundJump));
      }
    }

    const result = moveBodySimple(
      dt,
      {
        aabb: aabb,
        velocity: [...becomeNPCState.velocity],
      },
      GROUP_PLACEMENT_ENVIRONMENT_PARAMS,
      this.makeCollisionIndex(),
      forces,
      []
    );

    becomeNPCState.position = add(
      becomeNPCState.position,
      result.movement.impulse
    );
    becomeNPCState.velocity = [...result.movement.velocity];
  }

  maybeUpdateServerPosition() {
    const becomeNPCState = this.resources.get("/scene/npc/become_npc");
    if (
      becomeNPCState.kind === "empty" ||
      !this.resources.get("/ecs/entity", becomeNPCState.entityId)
    ) {
      return;
    }

    const shouldUpdate = !relevantBiscuitForEntityId(
      this.resources,
      becomeNPCState.entityId
    )?.isRobot;

    if (
      shouldUpdate &&
      this.previewUpdateEventThrottle.testAndSet() &&
      this.previewUpdatePositionThrottle.test({
        position: becomeNPCState.position,
        orientation: becomeNPCState.orientation,
      })
    ) {
      // Fire NPC update position event
      fireAndForget(
        this.events.publish(
          new SetNPCPositionEvent({
            id: this.userId,
            entity_id: becomeNPCState.entityId,
            orientation: becomeNPCState.orientation,
            position: becomeNPCState.position,
            update_spawn: false,
          })
        )
      );
    }
  }

  updateAllowed() {
    const becomeNPCState = this.resources.get("/scene/npc/become_npc");
    if (becomeNPCState.kind === "empty") {
      return;
    }
    const entity = this.resources.get("/ecs/entity", becomeNPCState.entityId);
    if (!entity) {
      return;
    }

    const relevantBiscuit = relevantBiscuitForEntityId(
      this.resources,
      becomeNPCState.entityId
    );

    becomeNPCState.cannotPlaceReason = undefined;
    if (relevantBiscuit?.isRobot) {
      becomeNPCState.cannotPlaceReason = invalidPlacementReason(
        this,
        relevantBiscuit,
        becomeNPCState.position
      );
    }
  }

  tick(dt: number) {
    this.handlePhysics(dt);
    this.updateAllowed();
    this.maybeUpdateServerPosition();
  }
}
