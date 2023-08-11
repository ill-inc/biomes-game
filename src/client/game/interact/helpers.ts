import { getOwnedItems } from "@/client/components/inventory/helpers";
import { addToast } from "@/client/components/toast/helpers";
import type { InteractionErrorWithoutTime } from "@/client/components/toast/types";
import type { GardenHose } from "@/client/events/api";
import type { AudioManager } from "@/client/game/context_managers/audio_manager";
import type { Events } from "@/client/game/context_managers/events";
import type { PermissionsManager } from "@/client/game/context_managers/permissions_manager";
import type { ClientTable } from "@/client/game/game";
import {
  checkActionAllowedIfBlueprintVoxel,
  doCreateCraftingStation,
  getBlueprintAtPosition,
  isBlueprintCompleted,
  terrainAtPosition,
} from "@/client/game/helpers/blueprint";
import { farmingAt, plantExperimentalAt } from "@/client/game/helpers/farming";
import { cameraRotationForGroup } from "@/client/game/helpers/group";
import { groupOccupancyAt, occupancyAt } from "@/client/game/helpers/occupancy";
import { allowPlacement, placementPos } from "@/client/game/helpers/placeables";
import { AttackDestroyInteractionError } from "@/client/game/interact/errors";
import { isPotentialGroupVoxel } from "@/client/game/interact/item_types/attack_destroy_delegate_item_helpers";
import type {
  ActionType,
  AttackInfo,
  InteractContext,
} from "@/client/game/interact/types";
import type { Player } from "@/client/game/resources/players";
import type {
  ClientReactResources,
  ClientResourceDeps,
  ClientResources,
} from "@/client/game/resources/types";
import { becomeTheNPC } from "@/client/game/scripts/become_npc";
import { forbiddenEditEffect } from "@/client/game/scripts/forbidden_edits";
import {
  getPlayerCreatedRobots,
  invalidPlacementReason,
} from "@/client/game/util/robots";
import { isAclAction } from "@/shared/acl_types";
import {
  terrainCollides,
  terrainShapeable,
} from "@/shared/asset_defs/quirk_helpers";
import type { ShapeName } from "@/shared/asset_defs/shapes";
import { getIsomorphism } from "@/shared/asset_defs/shapes";
import type { TerrainName } from "@/shared/asset_defs/terrain";
import { getTerrainID } from "@/shared/asset_defs/terrain";
import { EAGER_EXPIRATION_MS } from "@/shared/constants";
import { using } from "@/shared/deletable";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import {
  DestroyBlueprintEvent,
  DestroyGroupEvent,
  DestroyPlaceableEvent,
  DumpWaterEvent,
  EditEvent,
  FertilizePlantEvent,
  PickUpRobotEvent,
  PlacePlaceableEvent,
  PlaceRobotEvent,
  PlantSeedEvent,
  RemoveBuffEvent,
  ReplenishWateringCanEvent,
  ScoopWaterEvent,
  ShapeEvent,
  TillSoilEvent,
  UpdateNpcHealthEvent,
  UpdatePlayerHealthEvent,
  WaterPlantsEvent,
} from "@/shared/ecs/gen/events";
import type {
  DamageSource,
  Item,
  OwnedItemReference,
  Vec2f,
} from "@/shared/ecs/gen/types";
import { aclForTerrainPlacement } from "@/shared/game/acls";
import { damagePerEntityAttack } from "@/shared/game/damage";
import { tilledSoilIsomorphism } from "@/shared/game/farming";
import { isFloraId } from "@/shared/game/ids";
import { maybeGetSlotByRef } from "@/shared/game/inventory";
import { anItem } from "@/shared/game/item";
import { getAabbForPlaceable } from "@/shared/game/placeables";
import type { EagerShape } from "@/shared/game/resources/terrain";
import type { ShardId } from "@/shared/game/shard";
import { blockPos, voxelShard } from "@/shared/game/shard";
import { getCameraDirection, setPosition } from "@/shared/game/spatial";
import { blockIsEmpty } from "@/shared/game/terrain_helper";
import type { BiomesId } from "@/shared/ids";
import {
  aabbIterator,
  add,
  discreteRotationWithReflection,
  equals,
  floor,
  normalizev,
  reflectAndPermuteVectors,
  scale,
  shiftAABB,
  sub,
  voxelsToAABB,
} from "@/shared/math/linear";
import { faceToOrientation } from "@/shared/math/normals";
import type {
  AABB,
  ReadonlyAABB,
  ReadonlyVec3,
  Vec3,
} from "@/shared/math/types";
import { yawVector } from "@/shared/physics/utils";
import { fireAndForget, sleep } from "@/shared/util/async";
import type { TimeWindow } from "@/shared/util/throttling";
import { EventThrottle } from "@/shared/util/throttling";
import { loadBlockWrapper } from "@/shared/wasm/biomes";
import type { VoxelooModule } from "@/shared/wasm/types";
import { Dir } from "@/shared/wasm/types/common";
import { ok } from "assert";
import { uniqueId } from "lodash";
import { Vector3 } from "three";

export interface AttackInteraction {
  attackedEntities: ReadonlyEntity[];
  attackInfo: AttackInfo;
  tool: Item | undefined;
}

export function handleAttackInteraction(
  deps: {
    resources: ClientResources;
    events: Events;
    audioManager: AudioManager;
  },
  { attackedEntities, tool }: AttackInteraction
) {
  const clock = deps.resources.get("/clock");
  const player = deps.resources.get("/scene/local_player");

  if (!player.isAttacking(clock.time)) {
    player.startAttack(
      clock.time,
      tool,
      deps.resources,
      deps.events,
      deps.audioManager
    );
  }

  const playerDamageBuff =
    deps.resources.get("/player/modifiers").attackDamage.increase;

  for (const entity of attackedEntities) {
    ok(entity.position);

    const damage = damagePerEntityAttack(tool, entity) + playerDamageBuff;
    const attackDir = normalizev(
      sub(entity.position.v, player.player.position)
    );

    const damageSource: DamageSource = {
      kind: "attack",
      attacker: player.id,
      dir: attackDir,
    };

    if (entity.player_status) {
      fireAndForget(
        deps.events.publish(
          new UpdatePlayerHealthEvent({
            id: entity.id,
            hpDelta: -damage,
            damageSource,
          })
        )
      );
    } else if (entity.npc_metadata) {
      // Send an attack event to the server.
      fireAndForget(
        deps.events.publish(
          new UpdateNpcHealthEvent({ id: entity.id, hp: -damage, damageSource })
        )
      );
    } else {
      throw new Error("Invalid entity for attack");
    }
  }

  // May want to do this smarter later. With this implementation, there could be a peace
  // buff that gives multiple effects but hitting an enemy would remove all of them.
  // If player has the peace buff, remove it since they are no longer peaceful.
  const playerModifiers = deps.resources.get("/player/modifiers");
  if (playerModifiers.peace.enabled) {
    // Find the buffs that give you peace.
    const peaceBuffs = player.buffs.filter(
      ({ item_id }) => anItem(item_id)?.playerModifiers?.peace?.enabled
    );

    // Remove each buff that is giving the player peace.
    for (const buff of peaceBuffs) {
      fireAndForget(
        deps.events.publish(new RemoveBuffEvent({ id: player.id, buff }))
      );
    }
  }
}

export function shapeTerrain(
  deps: {
    table: ClientTable;
    resources: ClientResources;
    events: Events;
    permissionsManager: PermissionsManager;
    actionThrottler: TimeWindow<ActionType>;
    gardenHose: GardenHose;
    audioManager: AudioManager;
    voxeloo: VoxelooModule;
  },
  pos: ReadonlyVec3,
  shapeName: ShapeName,
  toolRef: OwnedItemReference | undefined
) {
  const player = deps.resources.get("/scene/local_player");

  if (deps.actionThrottler.shouldThrottle("shape")) {
    return false;
  }

  if (!shapeName) {
    return false;
  }

  // don't allow shaping group shards
  // TODO: also verify on server side!!!!
  if (groupOccupancyAt(deps.resources, pos)) {
    throw new AttackDestroyInteractionError({
      kind: "message",
      message: "Can't edit group!",
    });
  }

  if (!deps.permissionsManager.getPermissionForAction(pos, "shape")) {
    return false;
  }

  const [reflect, permute] = reflectAndPermuteVectors(
    player.player.orientation
  );

  const shardId = voxelShard(...pos);

  const entity = deps.resources.get("/ecs/terrain", shardId);
  if (!entity) {
    return false;
  }
  const terrainShardId = entity.id;
  const blockPosition = blockPos(...pos);

  // Check to make sure that the location being shaped is shapeable.
  const terrainID = deps.resources
    .get("/terrain/tensor", shardId)
    ?.get(...blockPosition);
  if (terrainID && !terrainShapeable(terrainID)) {
    return false;
  }

  // Set the isomorphism based on the player's orientation. If the value is
  // the same then we flip the isomorphism vertically.
  const isomorphism = (() => {
    let ret = getIsomorphism(shapeName, reflect, permute);
    using(new deps.voxeloo.SparseBlock_U32(), (shapes) => {
      loadBlockWrapper(deps.voxeloo, shapes, entity.shard_shapes);
      if (shapes.get(...blockPosition) === ret) {
        const [rx, ry, rz] = reflect;
        ret = getIsomorphism(shapeName, [rx, ry || 1, rz], permute);
      }
    });
    return ret;
  })();

  maybeApplyEager(deps, shardId, pos, isomorphism, undefined);
  const blueprint = getBlueprintAtPosition(deps.table, pos);
  const blueprintCompleted = blueprint
    ? isBlueprintCompleted(deps.resources, blueprint.id)
    : undefined;

  fireAndForget(
    (async () =>
      deps.events.publish(
        new ShapeEvent({
          id: terrainShardId,
          position: pos,
          isomorphism: isomorphism,
          user_id: player.id,
          tool_ref: toolRef,
          blueprint_entity_id: blueprint?.id,
          blueprint_completed: blueprintCompleted,
        })
      ))()
  );
  if (blueprint && blueprintCompleted) {
    blueprintCompletedEffects(deps, blueprint);
  }

  deps.actionThrottler.use("shape");

  return true;
}

export function blueprintCompletedEffects(
  deps: {
    resources: ClientResources;
    events: Events;
    gardenHose: GardenHose;
    audioManager: AudioManager;
  },
  blueprint: { id: BiomesId; aabb: AABB; blueprintItem: Item }
) {
  deps.audioManager.playSound("blueprint_complete");
  deps.gardenHose.publish({
    kind: "blueprint_complete",
    entityId: blueprint.id,
    aabb: blueprint.aabb,
  });
  if (
    !blueprint.blueprintItem.isTemplate &&
    !blueprint.blueprintItem.requiresWand
  ) {
    doCreateCraftingStation(deps.resources, deps.events, blueprint.id);
  }
}

export function maybeApplyEager(
  deps: {
    resources: ClientResources;
  },
  shardId: ShardId,
  blockPos: ReadonlyVec3,
  isomorphism?: EagerShape["isomorphism"],
  block?: number
) {
  const tweaks = deps.resources.get("/tweaks");
  if (!tweaks.building.eagerBlocks) {
    return;
  }

  if (block !== undefined) {
    deps.resources.update("/terrain/eager_edits", shardId, (val) => {
      return val.edits.push({
        position: blockPos,
        material: block,
        createdAt: Date.now(),
      });
    });
    setTimeout(() => {
      const time = Date.now();
      deps.resources.update("/terrain/eager_edits", shardId, (val) => {
        val.edits = val.edits.filter(
          (edit) => time < edit.createdAt + EAGER_EXPIRATION_MS
        );
      });
    }, EAGER_EXPIRATION_MS);
  }

  deps.resources.update("/terrain/eager_shapes", shardId, (val) => {
    return val.shapes.push({
      position: blockPos,
      isomorphism,
      createdAt: Date.now(),
    });
  });
  setTimeout(() => {
    const time = Date.now();
    deps.resources.update("/terrain/eager_shapes", shardId, (val) => {
      val.shapes = val.shapes.filter(
        (shape) => time < shape.createdAt + EAGER_EXPIRATION_MS
      );
    });
  }, EAGER_EXPIRATION_MS);
}

export function destroyBlueprint(
  deps: {
    userId: BiomesId;
    events: Events;
    resources: ClientResources;
    permissionsManager: PermissionsManager;
    actionThrottler: TimeWindow<ActionType>;
  },
  blueprintId: BiomesId,
  pos: ReadonlyVec3,
  toolRef: OwnedItemReference | undefined
) {
  if (deps.actionThrottler.shouldThrottle("destroy")) {
    return false;
  }

  const ownerId = deps.resources.get(
    "/ecs/c/blueprint_component",
    blueprintId
  )?.owner_id;
  if (
    deps.userId !== ownerId &&
    !deps.permissionsManager.getPermissionForAction(pos, "destroy")
  ) {
    return false;
  }

  fireAndForget(
    (async () =>
      deps.events.publish(
        new DestroyBlueprintEvent({
          id: blueprintId,
          tool_ref: toolRef,
          user_id: deps.userId,
          position: pos,
        })
      ))()
  );
  deps.actionThrottler.use("destroy");
  return true;
}

export function destroyGroup(
  deps: {
    userId: BiomesId;
    events: Events;
    resources: ClientResources;
    permissionsManager: PermissionsManager;
  },
  pos: ReadonlyVec3,
  groupId: BiomesId,
  toolRef: OwnedItemReference | undefined
) {
  void (async () => {
    const rotation = cameraRotationForGroup(
      deps.resources.get("/scene/camera")
    );
    const placeableIds =
      deps.resources.get("/ecs/c/grouped_entities", groupId)?.ids || [];
    if (
      deps.permissionsManager.getPermissionForAction(pos, "destroy", groupId)
    ) {
      await deps.events.publish(
        new DestroyGroupEvent({
          id: groupId,
          user_id: deps.userId,
          tool_ref: toolRef,
          rotation,
          placeable_ids: placeableIds as BiomesId[],
          position: pos,
        })
      );
    }
  })();
}

export function actuallyDestroyPlaceable(
  deps: {
    userId: BiomesId;
    events: Events;
    resources: ClientResources;
    permissionsManager: PermissionsManager;
    actionThrottler: TimeWindow<ActionType>;
  },
  placeableId: BiomesId,
  pos: ReadonlyVec3,
  toolRef: OwnedItemReference | undefined
) {
  if (deps.actionThrottler.shouldThrottle("destroy")) {
    return false;
  }

  if (
    !deps.permissionsManager.getPermissionForAction(pos, "destroy", placeableId)
  ) {
    return false;
  }

  fireAndForget(
    (async () =>
      deps.events.publish(
        new DestroyPlaceableEvent({
          id: placeableId,
          user_id: deps.userId,
          tool_ref: toolRef,
        })
      ))()
  );
  deps.actionThrottler.use("destroy");
  return true;
}

export function destroyTerrain(
  deps: {
    userId: BiomesId;
    table: ClientTable;
    events: Events;
    resources: ClientResources;
    permissionsManager: PermissionsManager;
    audioManager: AudioManager;
    gardenHose: GardenHose;
    actionThrottler: TimeWindow<ActionType>;
  },
  pos: ReadonlyVec3,
  toolRef: OwnedItemReference | undefined,
  terrainId: number
) {
  if (deps.actionThrottler.shouldThrottle("destroy")) {
    return false;
  }

  const player = deps.resources.get("/scene/local_player");

  // Play sound-effect irrespective of success.
  const assetType = isFloraId(terrainId) ? "plant_hit" : "block_break";
  player.player.setSound(deps.resources, deps.audioManager, "break", assetType);

  if (
    !setVoxel(deps, {
      pos,
      terrainId: 0,
      toolRef,
    })
  ) {
    return false;
  }

  deps.actionThrottler.use("destroy");
  deps.gardenHose.publish({
    kind: "destroy",
    terrainId: terrainId,
  });
  return true;
}

export function setVoxel(
  deps: {
    table: ClientTable;
    userId: BiomesId;
    events: Events;
    resources: ClientResources;
    permissionsManager: PermissionsManager;
    actionThrottler: TimeWindow<ActionType>;
    gardenHose: GardenHose;
    audioManager: AudioManager;
  },
  {
    pos,
    terrainId,
    toolRef,
    permitReplacement,
    // Player placed a block below their feet and will be "boosted up". We need to pass this in here so
    // we know to allow a placement that intersects with the player.
    boostPlacement,
  }: {
    pos: ReadonlyVec3;
    terrainId: number;
    toolRef?: OwnedItemReference;
    permitReplacement?: boolean;
    boostPlacement?: boolean;
  }
): boolean {
  const localPlayer = deps.resources.get("/scene/local_player");
  const tweaks = deps.resources.get("/tweaks");
  if (terrainId) {
    if (!tweaks.building.allowSelfIntersecting && !boostPlacement) {
      if (localPlayer.player.intersectsVoxel(...pos)) {
        return false;
      }
    }
  }
  const shardId = voxelShard(...pos);

  const entity = deps.resources.get("/ecs/terrain", shardId);
  if (!entity) {
    return false;
  }

  if (groupOccupancyAt(deps.resources, pos)) {
    return false;
  }

  const blueprint = getBlueprintAtPosition(deps.table, pos);
  if (
    terrainId &&
    !checkActionAllowedIfBlueprintVoxel(blueprint?.id, deps.resources, pos, {
      kind: "place",
      terrainId,
    })
  ) {
    return false;
  }

  const currentTerrainId = terrainAtPosition(deps.resources, pos);
  if (currentTerrainId === terrainId) {
    // No-op, why bother?
    return false;
  } else if (currentTerrainId) {
    // Destroying or replacing the existing voxel.
    if (terrainId && !permitReplacement) {
      return false;
    }
    if (!deps.permissionsManager.getPermissionForAction(pos, "destroy")) {
      return false;
    }
  } else {
    // Placing a new voxel.
    if (
      !deps.permissionsManager.getPermissionForAction(
        pos,
        aclForTerrainPlacement(terrainId)
      )
    ) {
      return false;
    }
  }

  maybeApplyEager(deps, shardId, pos, undefined, terrainId);

  const blueprintCompleted = blueprint
    ? isBlueprintCompleted(deps.resources, blueprint.id)
    : undefined;

  fireAndForget(
    deps.events.publish(
      new EditEvent({
        id: entity.id,
        position: pos,
        value: terrainId,
        user_id: localPlayer.id,
        tool_ref: toolRef,
        blueprint_entity_id: blueprint?.id,
        blueprint_completed: blueprintCompleted,
      })
    )
  );
  if (blueprint && blueprintCompleted) {
    blueprintCompletedEffects(deps, blueprint);
  }
  return true;
}

export function waterPlants(
  deps: InteractContext<"userId" | "events" | "resources">,
  plantIds: BiomesId[],
  toolRef: OwnedItemReference | undefined
) {
  if (
    plantIds.length === 0 ||
    deps.actionThrottler.shouldThrottle("waterPlant")
  ) {
    return false;
  }
  fireAndForget(
    deps.events.publish(
      new WaterPlantsEvent({
        id: deps.userId,
        plant_ids: plantIds,
        tool_ref: toolRef,
      })
    )
  );
  deps.actionThrottler.use("waterPlant");
  return true;
}

export function replenishWater(
  deps: InteractContext<"userId" | "events" | "resources">,
  pos: Vec3,
  toolRef: OwnedItemReference | undefined
) {
  // Share action throttle with water plant
  if (deps.actionThrottler.shouldThrottle("waterPlant")) {
    return false;
  }
  const terrainShardId = deps.resources.get(
    "/ecs/terrain",
    voxelShard(...pos)
  )?.id;
  if (!terrainShardId) {
    return false;
  }
  fireAndForget(
    deps.events.publish(
      new ReplenishWateringCanEvent({
        id: terrainShardId,
        user_id: deps.userId,
        tool_ref: toolRef,
        position: pos,
      })
    )
  );
  deps.actionThrottler.use("waterPlant");
  return true;
}

export function fertilizePlant(
  deps: InteractContext<"userId" | "events" | "resources">,
  pos: ReadonlyVec3,
  toolRef: OwnedItemReference | undefined
) {
  if (deps.actionThrottler.shouldThrottle("fertilize")) {
    return false;
  }
  const plantId = plantExperimentalAt(deps.resources, pos);
  if (!plantId || deps.actionThrottler.shouldThrottle("fertilize")) {
    return false;
  }
  fireAndForget(
    deps.events.publish(
      new FertilizePlantEvent({
        id: plantId,
        user_id: deps.userId,
        tool_ref: toolRef,
      })
    )
  );
  deps.actionThrottler.use("fertilize");
  return true;
}

export function plantSeed(
  deps: InteractContext<
    "resources" | "permissionsManager" | "userId" | "events"
  >,
  pos: ReadonlyVec3,
  seed: OwnedItemReference | undefined
) {
  if (deps.actionThrottler.shouldThrottle("plant")) {
    return false;
  }
  if (!deps.permissionsManager.getPermissionForAction(pos, "plantSeed")) {
    return false;
  }
  const entity = deps.resources.get("/ecs/terrain", voxelShard(...pos));
  if (!entity) {
    return false;
  }
  const terrainShardId = entity.id;
  fireAndForget(
    (async () =>
      deps.events.publish(
        new PlantSeedEvent({
          id: terrainShardId,
          position: pos,
          user_id: deps.userId,
          seed,
          occupancy_id: occupancyAt(deps.resources, pos),
          existing_farming_id: farmingAt(deps.resources, pos),
        })
      ))()
  );
  deps.actionThrottler.use("plant");
  return true;
}

export function tillSoil(
  deps: InteractContext<
    "events" | "permissionsManager" | "userId" | "resources"
  >,
  hitPos: ReadonlyVec3,
  affectedPos: Vec3[],
  toolRef: OwnedItemReference | undefined
) {
  if (deps.actionThrottler.shouldThrottle("till")) {
    return false;
  }

  if (
    !deps.permissionsManager.clientActionAllowedAt("tillSoil", ...affectedPos)
  ) {
    return false;
  }

  const shards = new Set<BiomesId>();
  const occupancies = new Set<BiomesId>();
  for (const pos of affectedPos) {
    const shardId = voxelShard(...pos);
    const shardEntity = deps.resources.get("/ecs/terrain", shardId);
    if (shardEntity) {
      shards.add(shardEntity.id);
    }
    const occupancy = occupancyAt(deps.resources, pos);
    if (occupancy) {
      occupancies.add(occupancy);
    }
    maybeApplyEager(
      deps,
      shardId,
      pos,
      tilledSoilIsomorphism(),
      getTerrainID("soil")
    );
  }

  fireAndForget(
    (async () => {
      await deps.events.publish(
        new TillSoilEvent({
          id: deps.userId,
          positions: affectedPos,
          shard_ids: [...shards],
          tool_ref: toolRef,
          occupancy_ids: [...occupancies],
        })
      );
    })()
  );
  deps.actionThrottler.use("till");
  return true;
}

export function dumpWater(
  deps: InteractContext<"resources" | "events">,
  pos: ReadonlyVec3,
  dir: Dir
) {
  if (deps.actionThrottler.shouldThrottle("place")) {
    return false;
  }

  let shardId = voxelShard(...pos);
  let shardPos = blockPos(...pos);

  const terrain = deps.resources.get("/terrain/volume", shardId);
  if (!terrain) {
    return false;
  }

  // The placement depends on what's happening at the hit location.
  if (terrainCollides(terrain.get(...shardPos))) {
    pos = setPosition(pos, dir);
    shardId = voxelShard(...pos);
    shardPos = blockPos(...pos);
  }

  // Dump the water.
  const entity = deps.resources.get("/ecs/terrain", shardId);
  if (!entity) {
    return false;
  }
  void deps.events.publish(
    new DumpWaterEvent({ id: entity.id, pos: shardPos })
  );
  deps.actionThrottler.use("place");
  return true;
}

export function scoopWater(
  deps: InteractContext<"resources" | "events" | "voxeloo">,
  hitDistance: number
) {
  if (deps.actionThrottler.shouldThrottle("destroy")) {
    return false;
  }
  const camera = deps.resources.get("/scene/camera");

  const pos = camera.three.position.toArray();
  const dir = camera.three.getWorldDirection(new Vector3()).toArray();

  // Check to see if we hit water along the hit ray.
  let scoopPos: Vec3 | undefined = undefined;
  deps.voxeloo.march_faces(pos, dir, (x, y, z, d) => {
    if (d >= hitDistance + 0.1) {
      return false;
    }
    const id = voxelShard(x, y, z);
    const tensor = deps.resources.get("/water/tensor", id);
    if (tensor.get(...blockPos(x, y, z)) > 0) {
      scoopPos = [x, y, z];
      return false;
    }
    return true;
  });

  // Scoop the first water hit along the cast ray.
  if (scoopPos !== undefined) {
    scoopPos = scoopPos as Vec3;
    const shardId = voxelShard(...scoopPos);
    const entity = deps.resources.get("/ecs/terrain", shardId);
    if (entity) {
      void deps.events.publish(
        new ScoopWaterEvent({ id: entity.id, pos: blockPos(...scoopPos) })
      );
    }
    deps.actionThrottler.use("destroy");
    return true;
  }

  return false;
}

export function changeRadius(
  resources: ClientResources | ClientReactResources | ClientResourceDeps
): number {
  const playerModifiers = resources.get("/player/modifiers");
  const extraReach = playerModifiers.reach.increase;

  return resources.get("/tweaks").building.changeRadius + extraReach;
}

const interactionErrorThrottle = new EventThrottle(3000);

export function handleInteractionError(
  deps: InteractContext<"resources" | "audioManager" | "permissionsManager">,
  interactionError: InteractionErrorWithoutTime
) {
  if (!interactionErrorThrottle.testAndSet()) {
    return;
  }

  addToast(deps.resources, {
    id: uniqueId(),
    kind: "interaction_error",
    error: {
      ...interactionError,
      time: Date.now(),
    },
  });

  if (interactionError.kind === "acl_permission") {
    const pos = interactionError.pos;
    const aabb: ReadonlyAABB = interactionError.aabb ?? [
      pos,
      add(pos, [1, 1, 1]),
    ];

    forbiddenEditEffect(deps.resources, pos.toString(), aabb);

    const clock = deps.resources.get("/clock");
    const player = deps.resources.get("/scene/local_player");
    const [_pitch, yaw] = player.player.orientation;
    const force = scale(10, yawVector(yaw + Math.PI));
    deps.resources.update("/player/knockback", (knockback) => {
      knockback.knockback = {
        force: () => force,
        startTime: clock.time,
      };
    });
    deps.resources.update("/scene/camera_effects", (effectsHolder) => {
      effectsHolder.effects.push({
        kind: "shake",
        dampedMagnitude: 0.02,
        duration: 150,
        repeats: 10,
        start: performance.now(),
      });
    });
    deps.audioManager.playSound("forbidden");
  }
}

export function handleWandInteraction(
  deps: InteractContext<"resources" | "permissionsManager">,
  hitPosition: ReadonlyVec3
): boolean {
  if (
    !isPotentialGroupVoxel(deps.resources, deps.permissionsManager, hitPosition)
  ) {
    return false;
  }

  void (async () => {
    const mesh = await deps.resources.get("/groups/src/mesh");
    if (!mesh) {
      return;
    }
    // reset refinement
    deps.resources.set("/groups/src/refinement", {
      box: mesh.box,
    });
    deps.resources.set("/game_modal", {
      kind: "generic_miniphone",
      rootPayload: {
        type: "group_editor",
      },
      allowClickToDismiss: false,
    });
  })();
  return true;
}

export interface PlaceablePlacePrep {
  entityId: BiomesId | undefined;
  placePos: Vec3;
  inventoryRef: OwnedItemReference;
  inventoryItem: Item;
  placeableItem: Item;
  orientation: Vec2f;
}

export function preparePlaceablePlacement(
  deps: InteractContext<
    | "resources"
    | "permissionsManager"
    | "events"
    | "userId"
    | "gardenHose"
    | "table"
  >,
  position: ReadonlyVec3,
  face: number,
  placeableItem: Item,
  inventoryRef: OwnedItemReference
): PlaceablePlacePrep | undefined {
  if (deps.actionThrottler.shouldThrottle("place")) {
    return;
  }

  if (!allowPlacement(placeableItem, face)) {
    return;
  }

  const ownedItems = getOwnedItems(deps.resources, deps.userId);
  const inventoryItem = maybeGetSlotByRef(ownedItems, inventoryRef);

  ok(inventoryItem);

  let dir!: Dir;
  if (face === Dir.Y_POS || face === Dir.Y_NEG) {
    // Use camera face direction for placement on horizontal surface.
    dir = getCameraDirection(deps.resources.get("/scene/camera").three);
  } else {
    // Use face direction otherwise.
    dir = face;
  }

  const orientation = faceToOrientation(dir);
  const placePos = placementPos(placeableItem, position, face, orientation);
  const entityId = placeableItem.entityId || undefined;

  const aabb = getAabbForPlaceable(placeableItem.id, placePos, orientation);
  ok(aabb);

  if (!deps.permissionsManager.itemActionAllowedAABB(placeableItem, aabb)) {
    throw new AttackDestroyInteractionError({
      kind: "acl_permission",
      action: isAclAction(placeableItem.action)
        ? placeableItem.action
        : "place",
      pos: placePos,
      aabb: getAabbForPlaceable(placeableItem.id, placePos, orientation),
    });
  }

  if (placeableItem.isRobot) {
    const invalidReason = invalidPlacementReason(deps, placeableItem, placePos);
    if (invalidReason) {
      throw new AttackDestroyInteractionError({
        kind: "message",
        message: invalidReason,
      });
    }
  }

  return {
    entityId,
    placePos,
    inventoryRef,
    placeableItem,
    inventoryItem: inventoryItem.item,
    orientation,
  };
}

export function handlePlacePlaceableInteraction(
  deps: InteractContext<
    "resources" | "events" | "userId" | "gardenHose" | "table"
  >,
  placement: PlaceablePlacePrep
): boolean {
  if (placement.placeableItem.isRobot) {
    const playerOrientation = deps.resources.get(
      "/ecs/c/orientation",
      deps.userId
    )?.v;
    void (async () => {
      await deps.events.publish(
        new PlaceRobotEvent({
          id: deps.userId,
          robot_entity_id: placement.entityId,
          inventory_ref: placement.inventoryRef,
          position: placement.placePos,
          orientation: playerOrientation,
          item_id: placement.placeableItem.id,
        })
      );
      const robotEntityId = await (async () => {
        // Wait a bit for the entity to be un-iced or created.
        await sleep(200);
        // Already has an entityId since the robot was already placed before.
        if (placement.entityId) {
          return placement.entityId;
        }
        // No entityId -- first time this robot is being placed.
        // Get the robot the player just placed down.
        const placedRobot = getYoungestOwnedRobot(deps);
        return placedRobot?.id;
      })();

      if (robotEntityId) {
        void becomeTheNPC(deps, robotEntityId, {
          onRevert: () => {
            void deps.events.publish(
              new PickUpRobotEvent({
                id: deps.userId,
                entity_id: placement.entityId,
                player_id: deps.userId,
              })
            );
          },
        });
      }
    })();
  } else {
    fireAndForget(
      (async () =>
        deps.events.publish(
          new PlacePlaceableEvent({
            id: deps.userId,
            existing_placeable: placement.entityId,
            placeable_item: placement.placeableItem,
            inventory_item: placement.inventoryItem,
            inventory_ref: placement.inventoryRef,
            position: placement.placePos,
            orientation: placement.orientation,
          })
        ))()
    );
  }

  deps.gardenHose.publish({
    kind: "place_placeable",
    item: placement.placeableItem,
  });
  deps.actionThrottler.use("place");

  return true;
}

/// Checks if {center} is within the bounds of a voxel at {blockPos}.
function centeredOnBlock(
  center: ReadonlyVec3,
  blockPos: ReadonlyVec3
): boolean {
  if (blockPos === undefined || center === undefined) {
    return false;
  }

  return equals(floor(center), blockPos);
}

export function isBoostPlacement(
  deps: InteractContext<"resources">,
  pos: ReadonlyVec3,
  face: number | undefined
): boolean {
  if (face !== Dir.Y_POS) {
    return false;
  }
  if (!blockIsEmpty(add(pos, [0, 2, 0]), deps.resources)) {
    return false;
  }
  const localPlayer = deps.resources.get("/scene/local_player");
  const intersecting = localPlayer.player.intersectsVoxel(...pos);
  // We only want to trigger a boost placement if the player is squarely centered on a block.
  // This avoids weird boosts when you "intersect" a neighbouring block but you're just barely standing on it.
  const centered = centeredOnBlock(localPlayer.player.centerPos(), pos);
  return localPlayer.player.onGround && intersecting && centered;
}

export function handlePlaceVoxelInteraction(
  deps: InteractContext<
    | "resources"
    | "permissionsManager"
    | "events"
    | "userId"
    | "gardenHose"
    | "audioManager"
    | "table"
  >,
  pos: ReadonlyVec3,
  face: number | undefined,
  terrainName: TerrainName,
  toolRef: OwnedItemReference,
  permitReplacement: boolean
): boolean {
  if (deps.actionThrottler.shouldThrottle("place")) {
    return false;
  }
  const boostPlacement = isBoostPlacement(deps, pos, face);
  if (
    !setVoxel(deps, {
      pos,
      terrainId: getTerrainID(terrainName),
      toolRef,
      permitReplacement,
      boostPlacement,
    })
  ) {
    return false;
  }

  const localPlayer = deps.resources.get("/scene/local_player");
  const secondsSinceEpoch = deps.resources.get("/clock").time;
  deps.actionThrottler.use("place");
  deps.gardenHose.publish({ kind: "place_voxel" });
  if (boostPlacement) {
    deps.gardenHose.publish({
      kind: "boost_placement",
      entityId: localPlayer.id,
    });
  }
  localPlayer.onPlaceBlock(
    deps.events,
    deps.resources,
    deps.audioManager,
    secondsSinceEpoch,
    pos,
    face
  );

  return true;
}

function getYoungestOwnedRobot(
  deps: InteractContext<"table" | "userId">
): ReadonlyEntity | undefined {
  const playerOwnedRobots = Array.from(
    getPlayerCreatedRobots(deps.table, deps.userId)
  );

  if (playerOwnedRobots.length === 0) {
    return undefined;
  }

  return playerOwnedRobots.sort(
    (a, b) => (b.created_by?.created_at ?? 0) - (a.created_by?.created_at ?? 0)
  )[0];
}

export function iterateInteractPattern(
  player: Readonly<Player>,
  pos: ReadonlyVec3,
  tool?: Item
) {
  const pattern =
    tool?.interactPattern ??
    <AABB>[
      [0, 0, 0],
      [1, 1, 1],
    ];
  // Bounds -> voxels
  const voxelCorners = [pattern[0], sub(pattern[1], [1, 1, 1])];
  // Rotate by player direction along XZ plane
  // Note, this won't transform interactions facing up or down
  const rotatedVoxels = [
    discreteRotationWithReflection([0, player.orientation[1]], voxelCorners[0]),
    discreteRotationWithReflection([0, player.orientation[1]], voxelCorners[1]),
  ];
  // Rotated corners -> back into AABB.
  const rotatedPattern = voxelsToAABB(...rotatedVoxels);
  // Translate by hit pos
  const transformedPattern = shiftAABB(rotatedPattern, pos);

  return aabbIterator(transformedPattern);
}
