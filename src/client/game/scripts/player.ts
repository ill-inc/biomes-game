import {
  beginOrUpdateWarpEffect,
  finishWarpEffect,
} from "@/client/components/canvas_effects";
import { showStaleSession } from "@/client/components/contexts/StaleSessionContext";
import type { GardenHose, GardenHoseEvent } from "@/client/events/api";
import type { ChatIo } from "@/client/game/chat/io";
import type { MailMan } from "@/client/game/chat/mailman";
import type { ClientConfig } from "@/client/game/client_config";
import type { AudioManager } from "@/client/game/context_managers/audio_manager";
import type { AuthManager } from "@/client/game/context_managers/auth_manager";
import type { ClientIo } from "@/client/game/context_managers/client_io";
import type { Events } from "@/client/game/context_managers/events";
import type { ClientInput } from "@/client/game/context_managers/input";
import type { PermissionsManager } from "@/client/game/context_managers/permissions_manager";
import type { ClientTable } from "@/client/game/game";
import { allPlayerShardsLoaded } from "@/client/game/helpers/player_shards";
import type { Player } from "@/client/game/resources/players";
import type { ClientResources } from "@/client/game/resources/types";
import type { Script } from "@/client/game/scripts/script_controller";
import { fixedConstantScalarTransition } from "@/client/game/util/transitions";
import { respawn } from "@/client/game/util/warping";
import { reportClientError } from "@/client/util/request_helpers";
import { getTypedStorageItem } from "@/client/util/typed_local_storage";
import { minigamePublicPermalink } from "@/server/web/util/urls";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import { constructDeathMessage } from "@/shared/chat/death_message";
import { PICKUP_ATTEMPT_DELAY_MS } from "@/shared/constants";
import {
  AckWarpEvent,
  EnterRobotFieldEvent,
  MoveEvent,
  PickUpEvent,
  UpdatePlayerHealthEvent,
} from "@/shared/ecs/gen/events";
import { DropSelector, PlaceableSelector } from "@/shared/ecs/gen/selectors";
import type { EmoteType, OptionalDamageSource } from "@/shared/ecs/gen/types";
import type { CollisionCallback } from "@/shared/game/collision";
import { CollisionHelper } from "@/shared/game/collision";
import { anItem } from "@/shared/game/item";
import { getPlayerBuffs } from "@/shared/game/players";
import { friendlyShardId, shardsForAABB } from "@/shared/game/shard";
import { blockIsEmpty } from "@/shared/game/terrain_helper";
import type { BiomesId } from "@/shared/ids";
import {
  add,
  approxEquals,
  clampVecXZ,
  dist,
  length,
  lengthSq,
} from "@/shared/math/linear";
import type {
  AABB,
  ReadonlyVec2,
  ReadonlyVec3,
  Vec3,
} from "@/shared/math/types";
import {
  frozenConstraintY,
  groundedConstraint,
} from "@/shared/physics/constraints";
import {
  DEFAULT_ENVIRONMENT_PARAMS,
  PLAYER_SWIMMING_ENVIRONMENT_PARAMS,
  WATER_ENVIRONMENT_PARAMS,
  blendEnvironmentParams,
} from "@/shared/physics/environments";
import {
  flyingForce,
  scaleForceXZ,
  swimmingForce,
  verticalForce,
  walkingForce,
} from "@/shared/physics/forces";
import type { Environment } from "@/shared/physics/movement";
import {
  getGroundImpact,
  moveBodyFluid,
  moveBodyFlying,
  moveBodyWithClimbing,
} from "@/shared/physics/movement";
import type { Constraint, Force } from "@/shared/physics/types";
import { canClimbBlock, toGroundedIndex } from "@/shared/physics/utils";
import { fireAndForget } from "@/shared/util/async";
import { setDiff } from "@/shared/util/collections";
import { getNowMs } from "@/shared/util/helpers";
import {
  EventThrottle,
  StateThrottle,
  TickThrottle,
  TimeWindow,
} from "@/shared/util/throttling";
import { assertNever } from "@/shared/util/type_helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import { clamp, isEqual } from "lodash";

type MoveState = {
  position: ReadonlyVec3;
  velocity: ReadonlyVec3;
  orientation: ReadonlyVec2;
};

const DEFAULT_SHAKE_DELAY_MS = 1_000;
export const MILLISECONDS_PER_TICK = 16;

// Drown constants.
export const DROWN_DELAY_IN_TICKS = 15 * 60; // 15 seconds
const DROWN_INTERVAL_IN_TICKS = 5 * 60; // 5 seconds

// Regen constants.
const REGEN_DELAY_IN_TICKS = 5 * 60; // 5 seconds
const REGEN_INTERVAL_IN_TICKS = 1 * 60; // 1 seconds

// We don't know what block is dealing damage yet so just choose an
// arbitrary positive number to reset the block damage throttle to.
const BLOCK_DAMAGE_DEFAULT_DELAY_IN_TICKS = 1 * 60;

// Fall constants
const FALL_MINIMUM_IMPACT = 18; // 15 voxels per second
const FALL_IMPACT_DAMAGE_SCALAR = 1.0;
const FALL_IMPACT_DAMAGE_GROWTH = 1.2;

export class PlayerScript implements Script {
  readonly name = "player";

  // State variables that affect player physics.
  private runToggle: boolean = false;
  private runToggleDebouncing: boolean = false;
  private crouchToggle: boolean = false;
  private crouchToggleDebouncing: boolean = false;
  lastHp: number | undefined;

  // Jump state
  private activeJumps: number = 0;
  private wasJumping: boolean = false;
  // Performed a boost placement and have not yet been boosted.
  private requiresBoost: boolean = false;

  // Reporting helpers for understanding when a player is stuck.
  lastWarp: number | undefined;
  lastRunPhysics: number | undefined;
  lastAttemptedReportedVoid: number | undefined;
  hadReportedInVoid = false;

  // Throttles that implement delay-based health updates.
  private shakeThrottle = new EventThrottle(DEFAULT_SHAKE_DELAY_MS);
  private urlRewriteThrottle = new EventThrottle(2000);
  private regenThrottle = new TickThrottle(REGEN_DELAY_IN_TICKS);
  private drownThrottle = new TickThrottle(DROWN_DELAY_IN_TICKS);
  private blockDamageThrottle = new TickThrottle(
    BLOCK_DAMAGE_DEFAULT_DELAY_IN_TICKS
  );
  private enterRobotThrottle = new EventThrottle(60);
  private fireHealThrottle = new TickThrottle(60);
  private fireDamageThrottle = new TickThrottle(60);
  private ackWarpThrottle = new EventThrottle(100);

  private takingBlockDamage = false;

  // Don't attempt to pick up things too often.
  private pickupThrottle = new TimeWindow<BiomesId>(PICKUP_ATTEMPT_DELAY_MS);
  private inflightPickUps = new Set<BiomesId>();

  // A throttle to prevent sending
  private moveThrottle = new StateThrottle(
    {
      velocity: [0, 0, 0],
      position: [0, 0, 0],
      orientation: [0, 0],
    } as MoveState,
    (prev, { velocity, position, orientation }: MoveState) => {
      return {
        state: { velocity, position, orientation },
        allow: !isEqual({ velocity, position, orientation }, prev),
      };
    }
  );

  // Smoothing
  private smoothedSpeedModifier = fixedConstantScalarTransition(1.0, 0.01);

  private collidingEntityIds = new Set<BiomesId>();
  private groundCollidingEntityIds = new Set<BiomesId>();
  private cleanUps: Array<() => unknown> = [];

  constructor(
    readonly userId: BiomesId,
    readonly input: ClientInput,
    readonly events: Events,
    readonly chatIo: ChatIo,
    readonly io: ClientIo,
    readonly resources: ClientResources,
    readonly audioManager: AudioManager,
    readonly table: ClientTable,
    readonly mailman: MailMan,
    readonly clientConfig: ClientConfig,
    readonly gardenHose: GardenHose,
    readonly permissionsManager: PermissionsManager,
    readonly authManager: AuthManager,
    private readonly voxeloo: VoxelooModule
  ) {
    this.fireHealThrottle.reset(this.tweaks.fireHealth.healDelayS * 60);
    this.fireDamageThrottle.reset(this.tweaks.fireHealth.damageDelayS * 60);
    this.blockDamageThrottle.reset(BLOCK_DAMAGE_DEFAULT_DELAY_IN_TICKS);
    const callback = (event: GardenHoseEvent) => {
      this.onGardenHoseEvent(event);
    };
    this.gardenHose.on("anyEvent", callback);
  }

  onGardenHoseEvent(event: GardenHoseEvent) {
    if (event.kind === "boost_placement" && event.entityId === this.userId) {
      this.requiresBoost = true;
    }
  }

  clear() {
    for (const c of this.cleanUps) {
      c();
    }
    this.cleanUps = [];
  }

  get tweaks() {
    return this.resources.get("/tweaks");
  }

  intersect([v0, v1]: AABB, fn: CollisionCallback) {
    const ruleset = this.resources.get("/ruleset/current");
    const collisionFilter: CollisionCallback = (aabb, entity) => {
      if (
        entity?.id === this.userId ||
        ruleset.playerCollisionFilter(aabb, entity)
      ) {
        return true;
      }
      return fn(aabb, entity);
    };
    CollisionHelper.intersect(
      (id) => this.resources.get("/physics/boxes", id),
      this.table,
      this.resources.get("/ecs/metadata"),
      [v0, v1],
      collisionFilter
    );
  }

  publishMove(player: Player) {
    const localPlayer = this.resources.get("/scene/local_player");
    if (
      this.tweaks.syncPlayerPosition &&
      this.moveThrottle.test(player) &&
      !localPlayer.warpingInfo
    ) {
      fireAndForget(
        this.events.publish(
          new MoveEvent({
            id: this.userId,
            position: player.position,
            orientation: player.orientation,
            velocity: player.velocity,
          })
        )
      );
    }
  }

  private applyFallDamage(impact: number) {
    const damage =
      FALL_IMPACT_DAMAGE_SCALAR *
      Math.pow(1 + impact - FALL_MINIMUM_IMPACT, FALL_IMPACT_DAMAGE_GROWTH);
    this.applyHpChange(-damage, { kind: "fall", distance: impact }); // Eagerly apply
  }

  private applyDamageShake(hpDelta: number) {
    if (hpDelta >= 0) {
      return;
    }

    const health = this.resources.get("/ecs/c/health", this.userId);
    if (!health?.maxHp) {
      return;
    }
    if (health.maxHp === health.hp) {
      // Lost max HP, don't shake.
      return;
    }

    if (this.shakeThrottle.testAndSet()) {
      this.resources.update("/scene/camera_effects", (effectsHolder) => {
        const hpLossFraction = -hpDelta / health.maxHp;

        // Compute a shake magnitude that depends on the magnitude of health loss.
        const shakeParams = this.tweaks.onDamageCameraShake;
        const shakeFraction =
          (hpLossFraction - shakeParams.minDamageFractionForShake) /
          (1 - shakeParams.minDamageFractionForShake);
        if (shakeFraction <= 0) {
          return;
        }
        const dampedMagnitude =
          shakeParams.minDampedMagnitude +
          (shakeParams.maxDampedMagnitude - shakeParams.minDampedMagnitude) *
            shakeFraction;

        effectsHolder.effects.push({
          kind: "shake",
          dampedMagnitude,
          duration: this.tweaks.onDamageCameraShake.duration,
          repeats: this.tweaks.onDamageCameraShake.repeats,
          start: performance.now(),
        });
      });
    }
  }

  private applyHpChange(hpDelta: number, damageSource?: OptionalDamageSource) {
    const currentHealth = this.resources.get("/ecs/c/health", this.userId);
    if (
      currentHealth &&
      hpDelta !== 0 &&
      (hpDelta < 0 || currentHealth.hp < currentHealth.maxHp)
    ) {
      const modifiers = this.resources.get("/player/modifiers");
      const regenIntervalMultiplier = Math.max(
        1 + modifiers.regenIntervalAdd.increase,
        0
      );
      if (hpDelta < 0) {
        this.applyDamageShake(hpDelta);
        this.regenThrottle.reset(
          REGEN_INTERVAL_IN_TICKS * regenIntervalMultiplier
        );
      }
      fireAndForget(
        this.events.publish(
          new UpdatePlayerHealthEvent({
            id: this.userId,
            hpDelta,
            damageSource,
          })
        )
      );
    }
  }

  private updateHealth(player: Player) {
    // Apply effects on changes to health caused outside of the client (e.g. player getting attacked).
    this.respondToServerHealthChanges();
    this.updateMaxHealth();

    this.updateDrowningHealth();
    this.updateFireHealth(player);
    this.updateDamageBlockHealth();

    const regenIntervalMultiplier = Math.max(
      1 + this.resources.get("/player/modifiers").regenIntervalAdd.increase,
      0
    );
    if (
      this.regenThrottle.tick(REGEN_DELAY_IN_TICKS * regenIntervalMultiplier)
    ) {
      this.applyHpChange(this.tweaks.healthRegenAmount);
    }
  }

  private updateMaxHealth() {
    const mods = this.resources.get("/player/modifiers");
    const maxHealthMod = mods.maxHealth.increase;
    const newMaxHealth = 100 + maxHealthMod;
    const currentHealth = this.resources.get("/ecs/c/health", this.userId);
    if (currentHealth?.maxHp !== newMaxHealth) {
      fireAndForget(
        this.events.publish(
          new UpdatePlayerHealthEvent({ id: this.userId, maxHp: newMaxHealth })
        )
      );
    }
  }

  private updateDamageBlockHealth() {
    if (this.resources.get("/player/modifiers").lavaImmunity.enabled) {
      return;
    }

    const { standingOnBlock } = this.resources.get(
      "/players/environment",
      this.userId
    );

    if (!standingOnBlock?.damageOnContact) {
      this.blockDamageThrottle.reset(BLOCK_DAMAGE_DEFAULT_DELAY_IN_TICKS);
      this.takingBlockDamage = false;
    }
    // Block damage is starting.
    else if (standingOnBlock?.damageOnContact && !this.takingBlockDamage) {
      this.blockDamageThrottle.reset(
        standingOnBlock.damageOnContact.secondsUntilFirstDamage * 60
      );
      this.takingBlockDamage = true;
    } else if (
      this.blockDamageThrottle.tick(
        standingOnBlock.damageOnContact.secondsBetweenDamage * 60
      )
    ) {
      this.applyHpChange(-standingOnBlock.damageOnContact.damage, {
        kind: "block",
        biscuitId: standingOnBlock.id,
      });
    }
  }

  private updateDrowningHealth() {
    const { canBreathe } = this.resources.get(
      "/players/possible_terrain_actions",
      this.userId
    );

    if (canBreathe) {
      this.drownThrottle.reset(DROWN_DELAY_IN_TICKS);
    } else if (this.drownThrottle.tick(DROWN_INTERVAL_IN_TICKS)) {
      this.applyHpChange(-this.tweaks.healthWaterDamageAmount, {
        kind: "drown",
      });
    }
  }

  private updateFireHealth(player: Player) {
    const currentHealth = this.resources.get("/ecs/c/health", this.userId);
    if ((currentHealth?.hp ?? 0) <= 0) {
      return;
    }

    const { fireHealth } = this.tweaks;
    const radius = fireHealth.damageRadius + fireHealth.healRadius;
    let hpDelta = 0;
    for (const entity of this.table.scan(
      PlaceableSelector.query.spatial.inSphere(
        {
          center: player.position,
          radius,
        },
        { approx: true }
      )
    )) {
      if (entity.placeable_component.item_id !== BikkieIds.campfire) {
        continue;
      }
      const d = dist(player.position, entity.position.v);
      if (d < fireHealth.damageRadius) {
        hpDelta -= fireHealth.damageHp;
      } else if (d < radius) {
        hpDelta +=
          fireHealth.healHp *
          (1 - (d - fireHealth.damageRadius) / fireHealth.healRadius);
      }
    }

    if (hpDelta < 0) {
      this.fireHealThrottle.reset(this.tweaks.fireHealth.healDelayS * 60);
      if (
        this.fireDamageThrottle.tick(
          this.tweaks.fireHealth.damageIntervalS * 60
        )
      ) {
        this.applyHpChange(hpDelta, {
          kind: "fireDamage",
        });
      }
    } else if (hpDelta > 0) {
      this.fireDamageThrottle.reset(this.tweaks.fireHealth.damageDelayS * 60);
      if (
        this.fireHealThrottle.tick(this.tweaks.fireHealth.healIntervalS * 60)
      ) {
        this.applyHpChange(hpDelta, {
          kind: "fireHeal",
        });
      }
    } else {
      this.fireHealThrottle.reset(this.tweaks.fireHealth.healDelayS * 60);
      this.fireDamageThrottle.reset(this.tweaks.fireHealth.damageDelayS * 60);
    }
  }

  private respondToServerHealthChanges() {
    const currentHealth = this.resources.get("/ecs/c/health", this.userId);
    if (!currentHealth?.maxHp) {
      return;
    }

    if (this.lastHp !== undefined && this.lastHp > currentHealth.hp) {
      this.applyDamageShake(currentHealth.hp - this.lastHp);
    }

    this.lastHp = currentHealth.hp;
  }

  private performDeathActions() {
    const ruleset = this.resources.get("/ruleset/current");
    switch (ruleset.death.type) {
      case "autospawn":
        void respawn(this, ruleset.death.destination);
        break;
      case "modal":
        if (this.resources.get("/game_modal").kind !== "death") {
          this.resources.set("/game_modal", { kind: "death" });
        }
        break;
      default:
        assertNever(ruleset.death);
    }
  }

  private maybeHandleDeath() {
    const health = this.resources.get("/ecs/c/health", this.userId);
    const localPlayer = this.resources.get("/scene/local_player");
    if (health && health.hp <= 0) {
      void this.chatIo.sendMessage(
        "chat",
        constructDeathMessage(health.lastDamageSource, (id) =>
          this.resources.get("/ecs/entity", id)
        )
      );
      this.performDeathActions();
      localPlayer.playerStatus = "dead";
      return true;
    }
    return false;
  }

  private maybeHandleOldSession() {
    if (this.io.isSwappingSyncTarget) {
      return;
    }
    const playerSession = this.resources.get(
      "/ecs/c/player_session",
      this.userId
    )?.id;
    if (playerSession === undefined) {
      return false;
    }
    if (playerSession === this.io.clientSessionId || this.io.isHotReload) {
      return false;
    }
    showStaleSession(this.resources);
    return true;
  }

  private climbable(aabb: AABB, dir: Vec3) {
    return canClimbBlock({
      index: (...args) => this.intersect(...args),
      aabb,
      dir,
    });
  }

  private getMovementType({ forward }: { forward: number }) {
    const flying = this.resources
      .get("/ruleset/current")
      .flying({ resources: this.resources });

    let running = !!this.input.motion("run");
    let crouching = !!this.input.motion("crouch");

    // Handle when toggle to run/swim.
    if (getTypedStorageItem("settings.keyboard.toggleRunSwimBool")) {
      if (running) {
        if (!this.runToggleDebouncing) {
          this.runToggle = !this.runToggle;
        }
        this.runToggleDebouncing = true;
      } else if (forward < 0) {
        this.runToggle = false;
        this.runToggleDebouncing = false;
      } else {
        this.runToggleDebouncing = false;
      }
      if (this.runToggle) {
        running = true;
      }
    }

    // Handle when toggle to crouch.
    if (getTypedStorageItem("settings.keyboard.toggleCrouchBool")) {
      if (crouching) {
        if (!this.crouchToggleDebouncing) {
          this.crouchToggle = !this.crouchToggle;
        }
        this.crouchToggleDebouncing = true;
      } else {
        this.crouchToggleDebouncing = false;
      }
      if (this.crouchToggle) {
        crouching = true;
      }
    }

    return { running, crouching, flying };
  }

  private doPhysics(dt: number, player: Player, shouldApplyMotion: boolean) {
    const localPlayer = this.resources.get("/scene/local_player");
    const playerControlModifiers = this.resources.get(
      "/player/control_modifiers",
      player.id
    );
    this.lastRunPhysics = getNowMs();
    let forward = shouldApplyMotion
      ? (Math.sign(this.input.motion("forward")) as -1 | 0 | 1)
      : 0;
    let lateral = shouldApplyMotion
      ? (Math.sign(this.input.motion("lateral")) as -1 | 0 | 1)
      : 0;

    if (playerControlModifiers.flipForward) {
      forward = (forward * -1) as -1 | 0 | 1;
    }
    if (playerControlModifiers.flipHorizontal) {
      lateral = (lateral * -1) as -1 | 0 | 1;
    }

    // Fetch the player's current environment to determine physics params.
    const { lastOnGround, onGround, standingOnBlock } = this.resources.get(
      "/players/environment",
      this.userId
    );
    const { waterDepth } = this.resources.get(
      "/players/environment/water",
      this.userId
    );
    const { canClimb, canSwim } = this.resources.get(
      "/players/possible_terrain_actions",
      this.userId
    );

    const { crouching, flying, running } = this.getMovementType({
      forward,
    });

    player.previousPosition = [...player.position];

    const swimming = canSwim;

    const playerModifiers = this.resources.get("/player/modifiers");
    const buffJumpMultiplier = Math.max(
      1 + playerModifiers.jumpAdd.increase,
      0
    );
    const jumpsAllowed = Math.max(1 + playerModifiers.jumpCount.increase, 0);
    this.smoothedSpeedModifier.target(
      clamp(
        1 + (swimming ? playerModifiers.swimmingSpeedAdd.increase : 0),
        0,
        1 + playerModifiers.speedAdd.increase
      )
    );
    this.smoothedSpeedModifier.tick(dt);

    // Figure out what direction the player is moving.
    const [pitch, yaw] = player.orientation;

    const speed =
      // Moving backwards is slower.
      (forward < 0
        ? this.tweaks.playerPhysics.reverse
        : this.tweaks.playerPhysics.forward) *
      // Crouching is slower.
      (crouching ? this.tweaks.playerPhysics.crouch : 1) *
      // Running is faster.
      (running ? this.tweaks.playerPhysics.runMultiplier : 1) *
      // Moving sideways is slower.
      (lateral === 0 ? 1 : this.tweaks.playerPhysics.lateralMultiplier) *
      this.smoothedSpeedModifier.get();

    // Assemble the list of input forces.
    let forces: Force[] = [];
    if (flying) {
      forces.push(flyingForce(speed, pitch, yaw, forward, lateral));
    } else if (swimming) {
      forces.push(
        swimmingForce(
          speed,
          pitch,
          yaw,
          forward,
          lateral,
          waterDepth,
          this.tweaks.playerPhysics.swimmingPitchOffset,
          this.tweaks.playerPhysics.swimmingSpeed
        )
      );
    } else if (forward || lateral) {
      forces.push(walkingForce(speed, yaw, forward, lateral));
      this.gardenHose.publish({
        kind: "move",
        running,
      });
    }

    const blockAboveIsEmpty = blockIsEmpty(
      add(player.position, [0, 2, 0]),
      this.resources
    );
    if (this.requiresBoost && blockAboveIsEmpty) {
      // We apply a manual update to the player's position because otherwise the player will collide with the
      // block they are placing and the escape forces will nullify the vertical translation we want.
      player.position[1] += 1.0;
    }
    this.requiresBoost = false;

    if (onGround) {
      this.activeJumps = 0;
    }
    if (
      !this.activeJumps &&
      !onGround &&
      lastOnGround.elapsed > this.tweaks.playerPhysics.jumpWindowMs
    ) {
      this.activeJumps = 1;
    }

    if (this.input.action("jump") && shouldApplyMotion) {
      let upwardsForceMagnitude = 0;
      if (flying) {
        upwardsForceMagnitude = this.tweaks.playerPhysics.flyingJump;
      } else if (
        onGround ||
        (!this.wasJumping && this.activeJumps < jumpsAllowed)
      ) {
        ++this.activeJumps;
        this.gardenHose.publish({ kind: "jump", running });
        player.velocity[1] = 0;
        upwardsForceMagnitude =
          this.tweaks.playerPhysics.groundJump * buffJumpMultiplier;
      } else if (canClimb) {
        upwardsForceMagnitude = this.tweaks.playerPhysics.climbingRise;
      } else if (swimming && waterDepth < 0.5) {
        player.velocity[1] = 0;
        upwardsForceMagnitude = this.tweaks.playerPhysics.waterEscape;
      } else if (swimming) {
        upwardsForceMagnitude = this.tweaks.playerPhysics.waterRise;
      }
      forces.push(verticalForce(upwardsForceMagnitude));
    }

    this.wasJumping = this.input.action("jump");

    this.resources.update("/player/knockback", (knockback) => {
      if (knockback.knockback) {
        const force = knockback.knockback.force;
        forces.push(force);
        knockback.knockback = undefined;
      }
    });

    if (crouching && flying) {
      forces.push(verticalForce(this.tweaks.playerPhysics.flyingDescend));
    }
    if (crouching && swimming) {
      forces.push(verticalForce(this.tweaks.playerPhysics.swimmingDescend));
    }

    // Add player-specific movement constraints.
    const constraints: Constraint[] = [];
    if (crouching && onGround) {
      constraints.push(
        groundedConstraint(
          toGroundedIndex((...args) => this.intersect(...args))
        )
      );
    }

    if (crouching && canClimb) {
      constraints.push(frozenConstraintY());
    }

    // Vary the environment params depending on the player being in water and player climbing.
    const environment = this.getPlayerEnvironment({
      canClimb,
      waterDepth,
      standingOnBlock,
    });
    environment.gravity /= buffJumpMultiplier;

    if (standingOnBlock?.surfaceSlip && onGround) {
      if (length(player.velocity) > standingOnBlock.surfaceSlip.maxSpeed) {
        player.velocity = clampVecXZ(player.velocity, {
          min: 0,
          max: standingOnBlock.surfaceSlip.maxSpeed,
        });
      }
      forces = forces.map((force) =>
        standingOnBlock.surfaceSlip
          ? scaleForceXZ(standingOnBlock.surfaceSlip.forceMultiplier, force)
          : force
      );
    }

    // Compute the moved body position.
    const result = (() => {
      if (flying) {
        return moveBodyFlying(
          dt,
          { aabb: player.aabb(), velocity: [...player.velocity] },
          environment,
          (...args) => this.intersect(...args),
          forces
        );
      } else if (swimming) {
        return moveBodyFluid(
          dt,
          { aabb: player.aabb(), velocity: [...player.velocity] },
          (...args) => this.intersect(...args),
          forces,
          PLAYER_SWIMMING_ENVIRONMENT_PARAMS
        );
      } else {
        return moveBodyWithClimbing(
          dt,
          { aabb: player.aabb(), velocity: [...player.velocity] },
          environment,
          (...args) => this.intersect(...args),
          (...args) => this.climbable(...args) || canClimb,
          forces,
          constraints
        );
      }
    })();

    // Process the results of the player motion for side effects.
    const groundImpact = getGroundImpact(result);

    // If the player just landed on the ground, do some stuff.
    if (
      !flying &&
      !swimming &&
      groundImpact > FALL_MINIMUM_IMPACT * buffJumpMultiplier &&
      localPlayer.fallAllowsDamage
    ) {
      this.applyFallDamage(groundImpact);
    }

    if (groundImpact) {
      localPlayer.fallAllowsDamage = true;
    }

    // Play a sound if we hit the ground hard enough.
    if (swimming && !player.swimming && !flying && result.velocity[1] < -7.0) {
      player.eagerEmote(this.events, this.resources, "splash");
    } else if (!swimming && !flying && groundImpact > 10.0) {
      player.setSound(
        this.resources,
        this.audioManager,
        "jump",
        "footstep_wood"
      );
    }

    // Cancel any emotes if we move.
    if (lengthSq(result.movement.impulse) > 1e-3) {
      const time = this.resources.get("/clock").time;
      if (player.isEmoting(time) && player.shouldCancelEmoteOnMove()) {
        player.eagerCancelEmote(this.events);
      }

      // Initiate a jump animation if the player left the ground.
      if (onGround && result.velocity[1] > 0.1) {
        player.lastJumpTime = time;
      }
    }

    player.position = add(player.position, result.movement.impulse);
    player.velocity = [...result.movement.velocity];
    player.onGround = onGround;
    player.running = running;
    player.crouching = crouching;
    player.swimming = swimming;
    player.flying = flying;
  }

  private getPlayerEnvironment({
    canClimb,
    waterDepth,
    standingOnBlock,
  }: {
    waterDepth: number;
    canClimb: boolean;
    standingOnBlock?: Biscuit;
  }): Environment {
    const blendedParams = blendEnvironmentParams(
      DEFAULT_ENVIRONMENT_PARAMS,
      WATER_ENVIRONMENT_PARAMS,
      waterDepth
    );

    const climbingGravityFactor = waterDepth > 0 ? 2 : 0.5;
    const climbingAirResistanceFactor = waterDepth > 0 ? 1 : 25;
    const frictionMultiplier =
      standingOnBlock?.surfaceSlip?.frictionMultiplier ?? 1;

    return {
      ...blendedParams,
      friction: blendedParams.friction * frictionMultiplier,
      gravity: canClimb
        ? blendedParams.gravity * climbingGravityFactor
        : blendedParams.gravity,
      airResistance: canClimb
        ? blendedParams.airResistance * climbingAirResistanceFactor
        : blendedParams.airResistance,
    };
  }

  private scanForPickups(player: Player) {
    const ruleset = this.resources.get("/ruleset/current");
    if (!ruleset.allowsBlockPickup) {
      return;
    }

    for (const id of this.table.scanIds(
      DropSelector.query.spatial.inSphere({
        center: [...player.position],
        radius: this.clientConfig.gameDropPickupDistance,
      })
    )) {
      if (this.inflightPickUps.has(id)) {
        continue;
      }
      if (this.pickupThrottle.shouldThrottle(id)) {
        continue;
      }
      this.pickupThrottle.use(id);
      this.inflightPickUps.add(id);
      fireAndForget(
        this.events
          .publish(new PickUpEvent({ id: player.id, item: id }))
          .finally(() => this.inflightPickUps.delete(id))
      );
    }
  }

  isAlive() {
    const localPlayer = this.resources.get("/scene/local_player");
    if (localPlayer.playerStatus === "alive") {
      return true;
    } else if (localPlayer.playerStatus === "respawning") {
      const health = this.resources.get("/ecs/c/health", this.userId);
      if (health && health.hp > 0) {
        return true;
      }
    } else {
      this.performDeathActions();
    }
    return false;
  }

  private makeVoidReport(message: string) {
    const player = this.resources.get("/scene/local_player");
    const shardIds = [...shardsForAABB(...player.player.aabb())];
    const presentTerrain = shardIds.map(
      (id) =>
        `${friendlyShardId(id)}/${this.resources.get("/ecs/terrain", id)?.id}`
    );
    const now = getNowMs();
    reportClientError("InVoid", message, {
      lastWarp: this.lastWarp ?? "unknown",
      lastWarpAge: this.lastWarp ? now - this.lastWarp : "unknown",
      lastRunPhysics: this.lastRunPhysics ?? "unknown",
      lastRunPhysicsAge: this.lastRunPhysics
        ? now - this.lastRunPhysics
        : "unknown",
      position: player.player.position,
      velocity: player.player.velocity,
      shardIds: shardIds.map(friendlyShardId),
      presentTerrain,
    });
  }

  private maybeReportOutOfVoid() {
    if (this.hadReportedInVoid) {
      this.makeVoidReport("Player got out of void");
    }
    this.hadReportedInVoid = false;
  }

  private maybeReportStuckInVoid() {
    if (this.hadReportedInVoid) {
      return;
    }
    const now = getNowMs();
    if (
      this.lastAttemptedReportedVoid !== undefined &&
      now - this.lastAttemptedReportedVoid < 30000
    ) {
      return;
    }
    this.lastAttemptedReportedVoid = now;
    setTimeout(() => {
      if (allPlayerShardsLoaded(this.resources)) {
        return;
      }
      this.hadReportedInVoid = true;
      this.makeVoidReport("Player is stuck in void");
    }, 1000);
  }

  private setPositionResources(ecsPlayer: Player) {
    const acls = this.permissionsManager.aclsForPosition(ecsPlayer.position);
    const selectedItem = this.resources.get("/hotbar/selection").item;
    const selectedItemActionAllowed = this.permissionsManager.itemActionAllowed(
      selectedItem,
      ...acls
    );

    const currentEffectiveACLs = this.resources.get("/player/effective_acl");
    const newEffectiveACLs = {
      acls,
      selectedItem,
      selectedItemActionAllowed,
    };

    if (!isEqual(currentEffectiveACLs, newEffectiveACLs)) {
      const oldAllowed = this.permissionsManager.itemActionAllowed(
        selectedItem,
        ...currentEffectiveACLs.acls
      );
      const newAllowed = this.permissionsManager.itemActionAllowed(
        selectedItem,
        ...newEffectiveACLs.acls
      );
      if (oldAllowed !== newAllowed && selectedItem) {
        // Only run the emote if ACLs changed but the item didn't
        const emoteType: EmoteType = selectedItemActionAllowed
          ? "equip"
          : "unequip";
        ecsPlayer.eagerEmote(this.events, this.resources, emoteType, {
          fishing_info: undefined,
          throw_info: undefined,
          item_override: selectedItem,
        });
      }

      this.resources.update("/player/effective_acl", (effectiveACLs) => {
        Object.assign(effectiveACLs, newEffectiveACLs);
      });
    }

    let maybeRobotId = this.permissionsManager.robotIdAt(
      this.resources,
      ecsPlayer.position
    );
    const robotNpcMetadata = maybeRobotId
      ? this.resources.get("/ecs/c/npc_metadata", maybeRobotId)
      : undefined;
    const robotBiscuit = anItem(robotNpcMetadata?.type_id);
    if (robotBiscuit?.hideProtectionArea) {
      maybeRobotId = undefined;
    }
    const currentRobot = this.resources.get("/player/effective_robot");
    if (currentRobot.value !== maybeRobotId) {
      this.resources.set("/player/effective_robot", {
        value: maybeRobotId,
      });
      this.gardenHose.publish({
        kind: "enter_robot_field",
        robotId: maybeRobotId,
      });
      if (maybeRobotId && this.enterRobotThrottle.testAndSet()) {
        fireAndForget(
          this.events.publish(
            new EnterRobotFieldEvent({
              id: ecsPlayer.id,
              robot_id: maybeRobotId,
            })
          )
        );
      }
    }
  }

  private hackResourceUpdates() {
    // Needed because these are indexed resources that invalidate their children
    // TODO: revisit this once we sort out resource tree invalidation
    const d = this.resources.get("/challenges/state_dispatch");
    this.resources.get("/challenges/trigger_state_dispatch");
    for (const id of d.questIdToState.keys()) {
      this.resources.get("/challenges/trigger_state/step_dispatch", id);
    }
  }

  private setApplicableBuffs() {
    const currentBuffs = this.resources.get("/player/applicable_buffs").buffs;
    let newBuffs = getPlayerBuffs(this.voxeloo, this.resources, this.userId);

    const localACL = this.resources.get("/player/effective_acl");
    const isAllowedBuffs = this.permissionsManager.clientActionAllowed(
      "apply_buffs",
      ...localACL.acls
    );

    if (!isAllowedBuffs) {
      newBuffs = currentBuffs.map((buff) => ({ ...buff, is_disabled: true }));
    }

    if (!isEqual(currentBuffs, newBuffs)) {
      this.resources.set("/player/applicable_buffs", { buffs: newBuffs });
    }
  }

  motionLocked() {
    // If we are in group placement mode then we should apply physics, but do
    // not apply any of the motion inputs to the player
    const placementPreview = this.resources.get("/groups/placement/preview");
    if (placementPreview && placementPreview.active()) {
      return true;
    }

    const becomeTheNPC = this.resources.get("/scene/npc/become_npc");
    if (becomeTheNPC.kind === "active") {
      return true;
    }

    const player = this.resources.get("/scene/local_player");
    if (player.fishingInfo?.state === "caught") {
      return true;
    }

    if (this.requiredWarpConsolidation(player.player)) {
      return true;
    }

    return false;
  }

  requiredWarpConsolidation(player: Readonly<Player>) {
    const clock = this.resources.get("/clock");
    const warpingToPosition = this.resources.get(
      "/ecs/c/warping_to",
      player.id
    );

    if (warpingToPosition && warpingToPosition.set_at < clock.time) {
      return warpingToPosition;
    }

    return undefined;
  }

  doWarpConsolidation(player: Player) {
    const pos = this.requiredWarpConsolidation(player);
    if (pos && this.ackWarpThrottle.testAndSet()) {
      const localPlayer = this.resources.get("/scene/local_player");
      localPlayer.playerStatus = "alive";
      if (!approxEquals(player.position, pos.position)) {
        beginOrUpdateWarpEffect(this.resources, () => {
          player.position = [...pos.position];
          if (pos.orientation) {
            player.orientation = [...pos.orientation];
          }
          this.onWarp(player);
          finishWarpEffect(this.resources);
        });
      } else {
        finishWarpEffect(this.resources);
      }
      fireAndForget(
        this.events.publish(new AckWarpEvent({ id: localPlayer.id }))
      );
    }
  }

  onWarp(player: Player) {
    player.eagerEmote(this.events, this.resources, "warp");
    const localPlayer = this.resources.get("/scene/local_player");
    localPlayer.fallAllowsDamage = false;
    localPlayer.lastWarp = getNowMs();
    this.resources.update("/scene/beams/transient", (beams) => {
      beams.beams.delete("home");
    });
    if (this.resources.get("/game_modal").kind === "homestone") {
      this.resources.set("/game_modal", {
        kind: "empty",
      });
    }

    this.gardenHose.publish({
      kind: "warped",
    });
  }

  getCollidingEntityIds(player: Player) {
    const { collidingEntities } = this.resources.get(
      "/players/environment",
      player.id
    );
    return new Set([...collidingEntities].map((x) => x.id));
  }

  updateCollidingEntities(player: Player) {
    const collidingEntityIds = this.getCollidingEntityIds(player);
    const started = setDiff(collidingEntityIds, this.collidingEntityIds);
    const stopped = setDiff(this.collidingEntityIds, collidingEntityIds);
    this.collidingEntityIds = collidingEntityIds;
    for (const entityId of started) {
      this.gardenHose.publish({
        kind: "start_collide_entity",
        entityId,
        playerId: player.id,
      });
    }
    for (const entityId of stopped) {
      this.gardenHose.publish({
        kind: "stop_collide_entity",
        entityId,
        playerId: player.id,
      });
    }
  }

  updateGroundCollidingEntities(player: Player) {
    const { onGround } = this.resources.get("/players/environment", player.id);
    const collidingEntityIds = onGround
      ? this.getCollidingEntityIds(player)
      : new Set<BiomesId>();
    const started = setDiff(collidingEntityIds, this.groundCollidingEntityIds);
    const stopped = setDiff(this.groundCollidingEntityIds, collidingEntityIds);
    this.groundCollidingEntityIds = collidingEntityIds;
    for (const entityId of started) {
      this.gardenHose.publish({
        kind: "start_ground_collide_entity",
        entityId,
        playerId: player.id,
      });
    }
    for (const entityId of stopped) {
      this.gardenHose.publish({
        kind: "stop_ground_collide_entity",
        entityId,
        playerId: player.id,
      });
    }
  }

  doURLRewrite(player: Player) {
    const h = window.location.pathname;

    const enabled = h === "" || h === "/" || h.startsWith("/at");

    if (!enabled) {
      return;
    }

    const name = this.resources.get("/ecs/c/label", player.id)?.text;
    const playingMinigame = this.resources.get(
      "/ecs/c/playing_minigame",
      player.id
    );
    let newPathname = "";
    if (playingMinigame) {
      const label = this.resources.get(
        "/ecs/c/label",
        playingMinigame.minigame_id
      );
      newPathname = minigamePublicPermalink(
        playingMinigame.minigame_id,
        label?.text
      );
    } else {
      newPathname = name ? `/at/${name}` : "";
    }

    if (
      newPathname !== "" &&
      newPathname !== h &&
      this.urlRewriteThrottle.testAndSet()
    ) {
      history.replaceState({}, "", newPathname + window.location.search);
    }
  }

  tick(dt: number) {
    this.hackResourceUpdates();
    if (this.maybeHandleOldSession()) {
      // Return immediately if they're an old session
      return;
    }

    if (!this.isAlive()) {
      // Return immediately if the player is alive or respawning.
      return;
    }

    const tweaks = this.resources.get("/tweaks");

    // Update the player's local state.
    this.resources.update("/sim/player", this.userId, (player) => {
      // Regen or decay the player's health based on the current environment.
      this.updateHealth(player);

      // Check to see if the player has died.
      if (this.maybeHandleDeath()) {
        return;
      }

      // Update the player's position only if all nearby shards are loaded.
      this.doWarpConsolidation(player);
      if (tweaks.permitVoidMovement || allPlayerShardsLoaded(this.resources)) {
        this.maybeReportOutOfVoid();
        this.doPhysics(dt, player, !this.motionLocked());
      } else {
        this.maybeReportStuckInVoid();
        this.publishMove(player);
      }

      // Check if we are on a checkpoint
      this.updateCollidingEntities(player);
      this.updateGroundCollidingEntities(player);

      // Don't process view changes when the game is not focused.
      if (!this.resources.get("/focus").focused) {
        return;
      }

      // See if we need to prolong our emote
      player.prolongEmote(this.events, this.resources);

      // Send the move event update if it's different from the last one we sent.
      this.publishMove(player);
      this.scanForPickups(player);
      this.setPositionResources(player);
      this.doURLRewrite(player);
      this.setApplicableBuffs();
    });
  }
}
