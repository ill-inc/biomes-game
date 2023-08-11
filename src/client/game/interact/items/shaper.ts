import {
  getBlueprintAtPosition,
  isBlueprintCompleted,
} from "@/client/game/helpers/blueprint";
import { groupOccupancyAt } from "@/client/game/helpers/occupancy";
import { AttackDestroyInteractionError } from "@/client/game/interact/errors";
import {
  blueprintCompletedEffects,
  changeRadius,
  maybeApplyEager,
} from "@/client/game/interact/helpers";
import type { AttackDestroyDelegateSpec } from "@/client/game/interact/item_types/attack_destroy_delegate_item_spec";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import type { InteractContext } from "@/client/game/interact/types";
import type { Player } from "@/client/game/resources/players";
import { shapeIDs } from "@/galois/assets/shapes";
import { getShaper, toShaperOrientation } from "@/shared/asset_defs/shapers";
import { getIsomorphism, type Isomorphism } from "@/shared/asset_defs/shapes";
import { ShapeEvent } from "@/shared/ecs/gen/events";
import type { OwnedItemReference } from "@/shared/ecs/gen/types";
import { toShapeId } from "@/shared/game/ids";
import { voxelShard } from "@/shared/game/shard";
import { hitExistingTerrain } from "@/shared/game/spatial";
import { TerrainHelper } from "@/shared/game/terrain_helper";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { fireAndForget } from "@/shared/util/async";

interface ShapeRequest {
  pos: ReadonlyVec3;
  isomorphism: Isomorphism;
  itemRef: OwnedItemReference;
  player: Readonly<Player>;
}

export class ShaperItemSpec implements AttackDestroyDelegateSpec {
  constructor(
    readonly deps: InteractContext<
      | "resources"
      | "permissionsManager"
      | "events"
      | "gardenHose"
      | "userId"
      | "table"
      | "audioManager"
      | "voxeloo"
    >
  ) {}

  private hasPermissionToShape(pos: ReadonlyVec3): boolean {
    if (!this.deps.permissionsManager.getPermissionForAction(pos, "shape")) {
      return false;
    }
    return true;
  }

  private getShapeRequest(
    itemInfo: ClickableItemInfo
  ): ShapeRequest | undefined {
    if (!itemInfo.item || !itemInfo.item.shaper) {
      return undefined;
    }

    const shaper = getShaper(itemInfo.item.shaper);
    if (!shaper) {
      return undefined;
    }

    const { hit } = this.deps.resources.get("/scene/cursor");
    if (
      !hitExistingTerrain(hit) ||
      hit.distance > changeRadius(this.deps.resources)
    ) {
      return undefined;
    }

    // Error out if you can shape but don't have permission.
    if (!this.hasPermissionToShape(hit.pos)) {
      throw new AttackDestroyInteractionError({
        kind: "acl_permission",
        action: "shape",
        pos: hit.pos,
      });
    }

    if (groupOccupancyAt(this.deps.resources, hit.pos)) {
      throw new AttackDestroyInteractionError({
        kind: "message",
        message: "Can't edit group!",
      });
    }

    // Identify the current isomorphism at the hit pos.
    const terrainHelper = TerrainHelper.fromResources(
      this.deps.voxeloo,
      this.deps.resources
    );
    const currentIsomorphism = terrainHelper.getIsomorphismID(hit.pos);

    // Identify the player's current quantized orientation.
    const { player } = this.deps.resources.get("/scene/local_player");
    const shaperOrientation = toShaperOrientation(player.orientation);

    return {
      pos: hit.pos,
      isomorphism: shaper.next(shaperOrientation, currentIsomorphism),
      player,
      itemRef: itemInfo.itemRef,
    };
  }

  // Carry of the shape request. Returns true if successful and false otherwise.
  private performShape({
    pos,
    isomorphism,
    player,
    itemRef,
  }: ShapeRequest): boolean {
    if (this.deps.actionThrottler.shouldThrottle("shape")) {
      return false;
    }

    // Lookup the shard entity information.
    const shardId = voxelShard(...pos);
    const entity = this.deps.resources.get("/ecs/terrain", shardId);
    if (!entity) {
      return false;
    }

    maybeApplyEager(this.deps, shardId, pos, isomorphism, undefined);
    const blueprint = getBlueprintAtPosition(this.deps.table, pos);
    const blueprintCompleted = blueprint
      ? isBlueprintCompleted(this.deps.resources, blueprint.id)
      : undefined;

    fireAndForget(
      (async () =>
        this.deps.events.publish(
          new ShapeEvent({
            id: entity.id,
            position: pos,
            isomorphism: isomorphism,
            user_id: player.id,
            tool_ref: itemRef,
            blueprint_entity_id: blueprint?.id,
            blueprint_completed: blueprintCompleted,
          })
        ))()
    );
    if (blueprint && blueprintCompleted) {
      blueprintCompletedEffects(this.deps, blueprint);
    }

    player.eagerEmote(this.deps.events, this.deps.resources, "place");
    return true;
  }

  onPrimaryDown(itemInfo: ClickableItemInfo) {
    const shapeRequest = this.getShapeRequest(itemInfo);
    if (shapeRequest) {
      return this.performShape(shapeRequest);
    }
    return false;
  }

  onSecondaryDown(itemInfo: ClickableItemInfo) {
    const request = this.getShapeRequest(itemInfo);
    if (!request) {
      return false;
    }

    const terrainHelper = TerrainHelper.fromResources(
      this.deps.voxeloo,
      this.deps.resources
    );
    const isomorphism = terrainHelper.getIsomorphismID(request.pos);
    if (isomorphism !== undefined && toShapeId(isomorphism) !== shapeIDs.full) {
      return this.performShape({
        ...request,
        isomorphism: getIsomorphism("full", [0, 0, 0], [0, 1, 2]),
      });
    }
    return false;
  }
}
