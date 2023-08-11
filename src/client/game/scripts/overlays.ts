import type { MailMan } from "@/client/game/chat/mailman";
import type { ClientConfig } from "@/client/game/client_config";
import type { AuthManager } from "@/client/game/context_managers/auth_manager";
import type { MapManager } from "@/client/game/context_managers/map_manager";
import type { ClientTable } from "@/client/game/game";
import { plantExperimentalAt } from "@/client/game/helpers/farming";
import {
  accurateNavigationAidPosition,
  navigationAidShowsPrecisionOverlay,
  PRECISE_NAVIGATION_AID_NDC_BOX,
  QUEST_PRECISE_MIN_RENDER_DISTANCE,
} from "@/client/game/helpers/navigation_aids";
import { groupOccupancyAt } from "@/client/game/helpers/occupancy";
import { changeRadius } from "@/client/game/interact/helpers";
import type { Camera } from "@/client/game/resources/camera";
import type {
  InspectableOverlay,
  Overlay,
  OverlayMap,
  ProjectionMap,
} from "@/client/game/resources/overlays";
import type { ClientResources } from "@/client/game/resources/types";
import type { Script } from "@/client/game/scripts/script_controller";
import { getTerrainID } from "@/shared/asset_defs/terrain";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import {
  DropSelector,
  MinigameElementsSelector,
  NamedQuestGiverSelector,
  NpcMetadataSelector,
  PlayerSelector,
  RestoredPlaceableSelector,
} from "@/shared/ecs/gen/selectors";
import { getAabbForEntity, getSizeForEntity } from "@/shared/game/entity_sizes";
import {
  canInventoryAcceptBag,
  isInventoryFull,
} from "@/shared/game/inventory";
import type { RequiredItem } from "@/shared/game/spatial";
import { hitExistingTerrain } from "@/shared/game/spatial";
import { getTerrainIdAndIsomorphismAtPosition } from "@/shared/game/terrain_helper";
import { terrainMarch } from "@/shared/game/terrain_march";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { log } from "@/shared/logging";
import {
  add,
  centerAABB,
  dist,
  dist2,
  dot,
  length,
  scale,
  sub,
  xzProject,
} from "@/shared/math/linear";
import { clamp } from "@/shared/math/math";
import type { AABB, ReadonlyVec3, Vec3 } from "@/shared/math/types";
import { idToNpcType, isNpcTypeId } from "@/shared/npc/bikkie";
import { displayUsername } from "@/shared/util/helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";
import { isEqual } from "lodash";
import { Vector3 } from "three";

const PLAYER_PROJECTION_OFFSET: Vec3 = [0, 0.35, 0];

function nameOverlayPosFromPlayer(
  resources: ClientResources,
  id: BiomesId
): Vec3 {
  const scenePlayer = resources.get("/scene/player", id);
  const aabb = scenePlayer.aabb();
  const ret = centerAABB(aabb);
  ret[1] = aabb[1][1];
  return ret;
}

function behindCamera(position: ReadonlyVec3, camera: Camera) {
  return dot(sub(position, camera.pos()), camera.view()) < 0;
}

function screenCoordinateProjection(
  position: ReadonlyVec3,
  camera: Camera,
  ndcClipBox: AABB = [
    [-1, -1, -1],
    [1, 1, Infinity],
  ]
) {
  if (behindCamera(position, camera)) {
    return null;
  }

  const threeProjection = new Vector3(...position);
  threeProjection.project(camera.three);
  if (
    threeProjection.x < ndcClipBox[0][0] ||
    threeProjection.x > ndcClipBox[1][0] ||
    threeProjection.y < ndcClipBox[0][1] ||
    threeProjection.y > ndcClipBox[1][1] ||
    threeProjection.z < ndcClipBox[0][2] ||
    threeProjection.z > ndcClipBox[1][2]
  ) {
    return null;
  }

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const screenX = ((threeProjection.x + 1) / 2) * screenWidth;
  const screenY = ((1 - threeProjection.y) / 2) * screenHeight;
  const projection = [screenX, screenY, threeProjection.z] as Vec3;
  return projection;
}

const OVERLAY_TEXT_TIME_MS = 5300; // Add 300 miliseconds for fade out (beginHide)

const MAX_PLAYER_OVERLAY_DIST = 20;
const MAX_NPC_OVERLAY_DIST = 15;
export const MAX_MINIGAME_OVERLAY_DIST = 50;

export class OverlayScript implements Script {
  readonly name = "overlay";

  lastLocalInventoryVersion: number = 0;
  inventoryFull: boolean = false;
  lastLandId: BiomesId | undefined = undefined;
  lastLandIdChanged: number = 0;
  lastPosition: Vec3 | undefined = undefined;

  constructor(
    private readonly userId: BiomesId,
    private readonly resources: ClientResources,
    private readonly table: ClientTable,
    private readonly mailMan: MailMan,
    private readonly clientConfig: ClientConfig,
    private readonly authManager: AuthManager,
    private readonly mapManager: MapManager,
    private readonly voxeloo: VoxelooModule
  ) {}

  applyNavigationAidOverlays(
    overlayMap: OverlayMap,
    projectionMap: ProjectionMap
  ) {
    if (
      this.resources
        .get("/ruleset/current")
        .disabledHuds?.includes("challenges")
    ) {
      return;
    }
    const camera = this.resources.get("/scene/camera");
    const localPlayer = this.resources.get("/scene/local_player");
    for (const e of this.mapManager.localNavigationAids.values()) {
      const overlayPosition = accurateNavigationAidPosition(
        this.userId,
        this.resources,
        e
      );
      if (!overlayPosition) {
        continue;
      }

      const playerDist = dist(e.pos, localPlayer.player.position);

      const distance2d = dist2(
        xzProject(overlayPosition),
        xzProject(localPlayer.player.position)
      );
      if (
        !navigationAidShowsPrecisionOverlay(
          e,
          this.mapManager.isTrackingQuest(e.challengeId ?? INVALID_BIOMES_ID),
          distance2d
        )
      ) {
        continue;
      }
      const offsetPosition = add(overlayPosition, [0, 0.65, 0]);
      const nameProjection = screenCoordinateProjection(
        offsetPosition,
        camera,
        PRECISE_NAVIGATION_AID_NDC_BOX
      );
      if (!nameProjection) {
        continue;
      }

      const key = `navigationAid:${e.id}`;
      projectionMap.set(key, {
        loc: nameProjection,
        proximity: clamp(
          1 - playerDist / QUEST_PRECISE_MIN_RENDER_DISTANCE,
          0,
          1
        ),
      });
      overlayMap.set(key, {
        kind: "navigation_aid",
        key,
        aid: e,
        isOccluded: this.isOccluded(offsetPosition, camera),
      });
    }
  }

  isOccluded(
    pos: ReadonlyVec3,
    camera: Camera,
    options: {
      assumeOccludedForDistance?: number;
    } = {
      assumeOccludedForDistance: 50,
    }
  ) {
    const tweaks = this.resources.get("/tweaks");
    if (!tweaks.performOverlayOcclusion) {
      return false;
    }

    const camPos = camera.three.position.toArray();
    let rayDir = sub(pos, camPos);
    const dist = length(rayDir);

    if (
      options.assumeOccludedForDistance !== undefined &&
      dist > options.assumeOccludedForDistance
    ) {
      return true;
    }

    const rayDist = length(rayDir);
    rayDir = scale(1 / Math.max(1e-5, rayDist), rayDir);

    let didHit = false;
    terrainMarch(this.voxeloo, this.resources, camPos, rayDir, rayDist, () => {
      didHit = true;
      return false;
    });
    return didHit;
  }

  applyPlayerNameOverlays(
    overlayMap: OverlayMap,
    projectionMap: ProjectionMap,
    showGremlins: boolean
  ) {
    const camera = this.resources.get("/scene/camera");
    const localPlayer = this.resources.get("/scene/local_player");

    for (const entity of this.table.scan(
      PlayerSelector.query.spatial.inSphere(
        {
          center: localPlayer.player.position,
          radius: MAX_PLAYER_OVERLAY_DIST,
        },
        {
          approx: true,
        }
      )
    )) {
      if ((entity.gremlin && !showGremlins) || !entity.player_status?.init) {
        continue; // don't allow inspecting invisible gremlins
      }
      const playerDist = dist(entity.position.v, localPlayer.player.position);

      if (playerDist > MAX_PLAYER_OVERLAY_DIST) {
        continue;
      }

      const namePos = add(
        nameOverlayPosFromPlayer(this.resources, entity.id),
        PLAYER_PROJECTION_OFFSET
      );
      const nameProjection = screenCoordinateProjection(namePos, camera);
      if (!nameProjection) {
        continue;
      }

      if (this.isOccluded(namePos, camera)) {
        continue;
      }

      const recentText = this.mailMan.recentTexts.get(entity.id);

      const key = `playerName:${entity.id}`;
      projectionMap.set(key, {
        loc: nameProjection,
        proximity: clamp(1 - playerDist / MAX_PLAYER_OVERLAY_DIST, 0, 1),
      });

      overlayMap.set(key, {
        kind: "name",
        key,
        entity,
        name: displayUsername(entity.label.text),
        typing: this.mailMan.isCurrentlyTyping(entity.id),
        beginHide:
          recentText &&
          recentText.createdAt + OVERLAY_TEXT_TIME_MS - 300 > Date.now()
            ? false
            : true,
        recentText:
          recentText && recentText.createdAt + OVERLAY_TEXT_TIME_MS > Date.now()
            ? recentText
            : undefined,
        health: undefined,
        entityId: entity.id,
      });
    }
  }

  applyNpcNameOverlays(overlayMap: OverlayMap, projectionMap: ProjectionMap) {
    const camera = this.resources.get("/scene/camera");
    const localPlayer = this.resources.get("/scene/local_player");

    for (const entity of this.table.scan(
      NpcMetadataSelector.query.spatial.inSphere({
        center: localPlayer.player.position,
        radius: MAX_NPC_OVERLAY_DIST,
      })
    )) {
      if (!isNpcTypeId(entity.npc_metadata.type_id)) {
        log.throttledError(
          10_000,
          `Entity ${entity.id} has npc_metadata but invalid type_id (${entity.npc_metadata.type_id})`
        );
        continue;
      }

      const npcType = idToNpcType(entity.npc_metadata.type_id);

      const shouldHideNameOverlay =
        npcType.behavior.hideNameOverlay?.hideNameOverlay;

      if (
        shouldHideNameOverlay ||
        !entity.health?.hp ||
        entity.health.hp <= 0
      ) {
        continue;
      }

      const npc = this.resources.cached("/scene/npc/render_state", entity.id);
      if (!npc) {
        continue;
      }

      const becomeTheNPC = this.resources.get("/scene/npc/become_npc");
      const motionOverrides =
        becomeTheNPC.kind === "active" && becomeTheNPC.entityId === entity.id
          ? becomeTheNPC
          : undefined;
      const npcPos = motionOverrides?.position ?? npc.smoothedPosition();
      const npcSize = entity.size.v;

      const namePos: Vec3 = add(
        [npcPos[0], npcPos[1] + npcSize[1], npcPos[2]],
        PLAYER_PROJECTION_OFFSET
      );
      const nameProjection = screenCoordinateProjection(namePos, camera);
      if (!nameProjection) {
        continue;
      }

      const npcDist = dist(entity.position.v, localPlayer.player.position);
      if (this.isOccluded(namePos, camera)) {
        continue;
      }

      const key = `npc:${entity.id}`;

      projectionMap.set(key, {
        loc: nameProjection,
        proximity: clamp(1 - npcDist / MAX_NPC_OVERLAY_DIST, 0, 1),
      });

      overlayMap.set(key, {
        kind: "name",
        key,
        entity,
        name: entity.label?.text ?? npcType.displayName,
        typing: false,
        beginHide: true,
        health: npcType.behavior.damageable?.attackable
          ? entity.health
          : undefined,
        entityId: entity.id,
        npcType,
      });
    }
  }

  applyMinigameElementOverlays(
    overlayMap: OverlayMap,
    projectionMap: ProjectionMap
  ) {
    const camera = this.resources.get("/scene/camera");
    const localPlayer = this.resources.get("/scene/local_player");

    for (const entity of this.table.scan(
      MinigameElementsSelector.query.spatial.inSphere({
        center: localPlayer.player.position,
        radius: MAX_MINIGAME_OVERLAY_DIST,
      })
    )) {
      const aabb = getAabbForEntity(entity);
      if (!aabb) {
        continue;
      }

      const namePos = centerAABB(aabb);
      namePos[1] = aabb[1][1];

      const nameProjection = screenCoordinateProjection(namePos, camera);
      if (!nameProjection) {
        continue;
      }

      const npcDist = dist(namePos, localPlayer.player.position);

      const key = `minigameElement:${entity.id}`;
      projectionMap.set(key, {
        loc: nameProjection,
        proximity: clamp(1 - npcDist / MAX_NPC_OVERLAY_DIST, 0, 1),
      });

      overlayMap.set(key, {
        kind: "minigame_element",
        key,
        minigameId: entity.minigame_element.minigame_id,
        elementId: entity.id,
        isOccluded: this.isOccluded(namePos, camera),
        pos: namePos,
      });
    }
  }

  applyQuestGiverNameOverlays(
    overlayMap: OverlayMap,
    projectionMap: ProjectionMap
  ) {
    const localPlayer = this.resources.get("/scene/local_player");

    for (const entity of this.table.scan(
      NamedQuestGiverSelector.query.spatial.inSphere({
        center: localPlayer.player.position,
        radius: MAX_NPC_OVERLAY_DIST,
      })
    )) {
      const npcKey = `npc:${entity.id}`;
      if (overlayMap.has(npcKey)) {
        continue; // Already handled in NPC selector above
      }

      this.basicEntityPosition(overlayMap, projectionMap, entity, npcKey, {
        kind: "name",
        key: npcKey,
        entity,
        name: entity.label?.text,
        typing: false,
        beginHide: true,
        entityId: entity.id,
      });
    }
  }

  applyRestoredPlaceableOverlay(
    overlayMap: OverlayMap,
    projectionMap: ProjectionMap
  ) {
    const localPlayer = this.resources.get("/scene/local_player");

    for (const entity of this.table.scan(
      RestoredPlaceableSelector.query.spatial.inSphere({
        center: localPlayer.player.position,
        radius: MAX_NPC_OVERLAY_DIST,
      })
    )) {
      if (
        entity.restores_to?.restore_to_state !== "deleted" ||
        !isFinite(entity.restores_to.trigger_at)
      ) {
        continue;
      }
      const key = `restoredPlaceable:${entity.id}`;
      this.basicEntityPosition(overlayMap, projectionMap, entity, key, {
        kind: "restored_placeable",
        key,
        entity,
      });
    }
  }

  private basicEntityPosition(
    overlayMap: OverlayMap,
    projectionMap: ProjectionMap,
    entity: ReadonlyEntity,
    key: string,
    overlay: Overlay
  ) {
    const localPlayer = this.resources.get("/scene/local_player");
    const camera = this.resources.get("/scene/camera");
    const npcPos = entity.position?.v;
    ok(npcPos);
    const npcSize = getSizeForEntity(entity);
    ok(npcSize);

    const namePos: Vec3 = add(
      [npcPos[0], npcPos[1] + npcSize[1], npcPos[2]],
      PLAYER_PROJECTION_OFFSET
    );
    const nameProjection = screenCoordinateProjection(namePos, camera);
    if (!nameProjection) {
      return;
    }
    const npcDist = dist(npcPos, localPlayer.player.position);
    if (this.isOccluded(namePos, camera)) {
      return;
    }

    projectionMap.set(key, {
      loc: nameProjection,
      proximity: clamp(1 - npcDist / MAX_NPC_OVERLAY_DIST, 0, 1),
    });

    overlayMap.set(key, overlay);
  }

  getTweakedInspectableOverlay(): InspectableOverlay | undefined {
    const overlay = this.getInspectableOverlay();
    if (!overlay) {
      return undefined;
    }
    const tweaks = this.resources.get(
      "/ecs/c/inspection_tweaks",
      overlay.entityId
    );
    if (tweaks?.hidden) {
      return {
        kind: "hidden",
        entityId: overlay.entityId,
        overlay: overlay,
      };
    }
    return overlay;
  }

  getInspectableOverlay(): InspectableOverlay | undefined {
    const { hit } = this.resources.get("/scene/cursor");

    if (
      hit?.kind === "entity" &&
      hit.distance <= changeRadius(this.resources)
    ) {
      const entity = hit.entity;
      ok(entity.position);
      if (entity.player_behavior) {
        return {
          kind: "player",
          key: `inspect:player:${entity.id}`,
          entityId: entity.id,
        };
      } else if (entity.robot_component) {
        return {
          kind: "robot",
          key: `inspect:robot:${entity.id}`,
          entityId: entity.id,
        };
      } else if (entity.npc_metadata) {
        const npcType = idToNpcType(entity.npc_metadata.type_id);
        return {
          kind: "npc",
          key: `inspect:npc:${entity.id}`,
          npcType: npcType,
          entity,
          entityId: entity.id,
        };
      } else if (entity.placeable_component && entity.placed_by) {
        return {
          kind: "placeable",
          key: `inspect:placeable:${entity.id}`,
          entityId: entity.id,
          itemId: entity.placeable_component.item_id,
          placerId: entity.placed_by.id,
        };
      }
    } else if (hitExistingTerrain(hit)) {
      const groupId = groupOccupancyAt(this.resources, hit.pos);
      if (groupId) {
        const label = this.resources.get("/ecs/c/label", groupId);
        if (label) {
          return {
            kind: "group",
            key: `inspect:group:${groupId}`,
            entityId: groupId,
            label: label.text,
          };
        }
      }
      const plantId = plantExperimentalAt(this.resources, hit.pos);
      if (plantId) {
        const camera = this.resources.get("/scene/camera");
        const projection = screenCoordinateProjection(
          add(hit.pos, [0.5, 1.0, 0.5]),
          camera
        );
        if (projection && hit.terrainId !== getTerrainID("soil")) {
          return {
            kind: "plant",
            key: `inspect:plant:${plantId}`,
            pos: hit.pos,
            entityId: plantId,
            projection,
          };
        }
      }
    }
  }

  applyLootOverlay(overlayMap: OverlayMap) {
    const localPlayer = this.resources.get("/scene/local_player");

    // If we have a full inventory, check if we have any nearby grab bags that we can't pick up
    const localInventoryVersion = this.resources.version(
      "/ecs/c/inventory",
      localPlayer.player.id
    );
    if (localInventoryVersion > this.lastLocalInventoryVersion) {
      this.lastLocalInventoryVersion = localInventoryVersion;
      const localInventory = this.resources.get(
        "/ecs/c/inventory",
        localPlayer.player.id
      );
      this.inventoryFull = isInventoryFull(localInventory);
    }

    let displayFullMessage = false;
    if (this.inventoryFull) {
      const localInventory = this.resources.get(
        "/ecs/c/inventory",
        localPlayer.player.id
      );

      for (const entity of this.table.scan(
        DropSelector.query.spatial.inSphere({
          center: localPlayer.player.position,
          radius: this.clientConfig.gameDropDistance,
        })
      )) {
        const drop = this.resources.cached("/scene/drops", entity.id);

        if (!localInventory || !entity.grab_bag?.slots) {
          continue;
        }
        const hasInventorySpace = canInventoryAcceptBag({
          inventory: localInventory,
          itemBag: entity.grab_bag?.slots,
        });
        const isDropPickupable = drop && drop.visible && drop.itemMesh;
        if (isDropPickupable && !hasInventorySpace) {
          displayFullMessage = true;
        }
      }
    }

    const lootEvents = this.resources.get("/overlays/loot");
    if (lootEvents.events.length === 0 && !displayFullMessage) {
      // don't do any of this when there isnt loot to display
      return;
    }
    const camera = this.resources.get("/scene/camera");

    // try to make a more stable left vector.
    // create an in-world vector facing screen left, with the width
    // of the bounding box, and transform that point back into
    // screen space. using AABB directly will bounce the pos back
    // and forth when we rotate
    const bounding = localPlayer.player.aabb();
    const boundingWidth = (bounding[1][0] - bounding[0][0]) / 2;
    const playerPos = new Vector3(...localPlayer.player.position);
    playerPos.add(new Vector3(0, 0.7, 0));
    const cameraFacing = new Vector3(0, 0, 0);
    cameraFacing.copy(camera.three.position);
    cameraFacing.sub(playerPos);
    cameraFacing.normalize();
    const leftVec = new Vector3(0, -1, 0);
    leftVec.cross(cameraFacing);
    leftVec.multiplyScalar(boundingWidth * 1.5);
    const leftBoundary = new Vector3(0, 0, 0);
    leftBoundary.copy(playerPos);
    leftBoundary.add(leftVec);
    leftBoundary.project(camera.three);

    const screenPos = ((1 + leftBoundary.x) / 2) * window.innerWidth;

    // Send the overlay the left-most side of the AABB so they can try avoid
    // overlapping the character
    overlayMap.set("loot", {
      kind: "loot",
      key: "loot",
      displayFullMessage: displayFullMessage,
      posX: screenPos,
    });
  }

  applyBlueprintOverlay(overlayMap: OverlayMap) {
    const { hit } = this.resources.get("/scene/cursor");
    if (hit?.kind !== "blueprint") {
      return;
    }
    let cursorItem: RequiredItem | undefined;

    const [terrainId, isomorphism] = getTerrainIdAndIsomorphismAtPosition(
      this.resources,
      hit.pos
    );
    if (terrainId && hit.requiredItem.kind === "terrain") {
      cursorItem = {
        kind: "terrain",
        blueprintId: hit.requiredItem.blueprintId,
        position: hit.pos,
        terrainId,
        isomorphism,
      };
    }

    const blueprint = this.resources.get(
      "/groups/blueprint/state",
      hit.blueprintEntityId
    );
    overlayMap.set("blueprint", {
      kind: "blueprint",
      key: `blueprint:${hit.blueprintEntityId}`,
      entityId: hit.blueprintEntityId,
      voxelPos: hit.pos,
      cursorItem,
      requiredItem: hit.requiredItem,
      completed: blueprint.completed,
    });
  }

  applyFishMeterOverlay(overlayMap: OverlayMap) {
    const selection = this.resources.get("/hotbar/selection");
    if (selection.kind === "hotbar" && selection.item?.action === "fishMeter") {
      overlayMap.set("fish_meter", {
        kind: "fish_meter",
      });
    }
  }

  applyBlueprintPlacementOverlay(overlayMap: OverlayMap) {
    const selection = this.resources.get("/hotbar/selection");
    if (selection.kind === "hotbar" && selection.item?.isBlueprint) {
      const playerHasRequiredItems = this.resources.get(
        "/groups/blueprint/has_required_items",
        selection.item.id
      );
      if (!playerHasRequiredItems) {
        const key = "blueprint_placement";
        overlayMap.set(key, {
          kind: "blueprint_placement",
          key,
        });
      }
    }
  }

  applyAllOverlays(overlayMap: OverlayMap, projectionMap: ProjectionMap) {
    const tweaks = this.resources.get("/tweaks");
    const showGremlins =
      this.authManager.currentUser.hasSpecialRole("seeGremlins") &&
      tweaks.showGremlins;
    const showNpcs = this.resources.get("/tweaks").showNpcs;
    this.applyPlayerNameOverlays(overlayMap, projectionMap, showGremlins);
    if (showNpcs) {
      this.applyNpcNameOverlays(overlayMap, projectionMap);
    }
    this.applyQuestGiverNameOverlays(overlayMap, projectionMap);
    this.applyMinigameElementOverlays(overlayMap, projectionMap);
    this.applyRestoredPlaceableOverlay(overlayMap, projectionMap);
    const selection = this.resources.get("/hotbar/selection");
    if (selection?.kind !== "camera") {
      if (tweaks.bigNavigationAids) {
        this.applyNavigationAidOverlays(overlayMap, projectionMap);
      }
      // Show tutorial overlay over inspectable overlays
      this.applyBlueprintOverlay(overlayMap);
      this.applyBlueprintPlacementOverlay(overlayMap);
      const inspectable = this.getTweakedInspectableOverlay();
      if (inspectable) {
        overlayMap.set("inspectable", inspectable);
      }
      this.applyLootOverlay(overlayMap);
      this.applyFishMeterOverlay(overlayMap);
    }
  }

  tick(_dt: number) {
    const curTime = Date.now();
    const lootTimeout = 5 * 1000;
    const lootEvents = this.resources.get("/overlays/loot");
    // Check only the oldest event if we need to update
    if (
      lootEvents &&
      lootEvents.events.length !== 0 &&
      (!lootEvents.events[0] ||
        curTime - lootEvents.events[0].time > lootTimeout)
    ) {
      this.resources.update("/overlays/loot", (lootEvents) => {
        let toRemove = 0;
        for (let idx = 0; idx < lootEvents.events.length; idx++) {
          const evt = lootEvents.events[idx];
          if (!evt || curTime - evt.time > lootTimeout) {
            toRemove += 1;
          } else {
            break;
          }
        }
        lootEvents.events.splice(0, toRemove);
        lootEvents.version += 1;
      });
    }

    const newOverlays: OverlayMap = new Map();
    const newProjection: ProjectionMap = new Map();
    this.applyAllOverlays(newOverlays, newProjection);

    const oldOverlays = this.resources.get("/overlays");
    if (!isEqual(newOverlays, oldOverlays)) {
      this.resources.update("/overlays", (overlayMap) => {
        const oldCopy = new Map(oldOverlays);
        overlayMap.clear();

        // This makes it so we re-use the same object if it hasn't changed, which plays nicely with React.memo out of the box
        newOverlays.forEach((val, key) => {
          const oldVal = oldCopy.get(key);
          if (oldVal && isEqual(oldVal, val)) {
            overlayMap.set(key, oldVal);
          } else {
            overlayMap.set(key, val);
          }
        });
      });
    }

    this.resources.update("/overlays/projection", (projMap) => {
      projMap.clear();
      for (const [k, v] of newProjection) {
        projMap.set(k, v);
      }
    });
  }
}
