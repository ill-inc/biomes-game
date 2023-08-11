import {
  aclChecker,
  makeEventHandler,
  newId,
  RollbackError,
} from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { newDrop } from "@/server/logic/utils/drops";
import { involvedShards } from "@/server/logic/utils/groups";
import { BLUEPRINT_EXPIRATION_S } from "@/shared/constants";
import { using } from "@/shared/deletable";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import {
  BlueprintComponent,
  Collideable,
  Expires,
  Orientation,
  Position,
} from "@/shared/ecs/gen/components";
import type { Blueprint } from "@/shared/ecs/gen/entities";
import type { GrabBagFilter, Vec3f } from "@/shared/ecs/gen/types";
import { getBlueprintData } from "@/shared/game/blueprint";
import {
  aabbToBox,
  boxToAabb,
  groupTensorBox,
  rotateGroupTensor,
  scanGroupTensor,
} from "@/shared/game/group";
import { anItem } from "@/shared/game/item";
import { countOf } from "@/shared/game/items";
import { getAabbForPlaceable } from "@/shared/game/placeables";
import * as Shards from "@/shared/game/shard";
import type { Terrain } from "@/shared/game/terrain/terrain";
import type { BiomesId } from "@/shared/ids";
import { add, centerAABBXZ, integerAABB, sub } from "@/shared/math/linear";
import { orientationToRotation } from "@/shared/math/rotation";
import type { ReadonlyVec2, ReadonlyVec3 } from "@/shared/math/types";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";

function checkTerrainForBlueprint(
  voxeloo: VoxelooModule,
  allTerrain: Terrain[],
  itemId: BiomesId,
  position: ReadonlyVec3,
  orientation: ReadonlyVec2
) {
  const { tensor: tensorBlob } = getBlueprintData(itemId);
  using(new voxeloo.GroupTensor(), (tensor) => {
    tensor.load(tensorBlob);
    const rotation = orientationToRotation(orientation);
    using(rotateGroupTensor(voxeloo, tensor, rotation), (rotatedTensor) => {
      const aabb = boxToAabb(groupTensorBox(rotatedTensor));
      const center = centerAABBXZ(aabb);
      const v0 = sub(position, center);
      for (const { tensorPos } of scanGroupTensor(rotatedTensor)) {
        const worldPos = add(tensorPos, v0);
        const shardId = Shards.voxelShard(...worldPos);
        const blockPos = Shards.blockPos(...worldPos);
        const terrain = allTerrain.find((t) => t.shardId === shardId);

        // Check interference with occupancy.
        if (terrain?.occupancy.get(...blockPos)) {
          throw new RollbackError(
            `Blueprint ${itemId} collides with terrain at ${worldPos}`
          );
        }
      }
    });
  });
}

export const placeBlueprintEventHandler = makeEventHandler(
  "placeBlueprintEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => {
      const aabb = getAabbForPlaceable(
        event.item,
        event.position,
        event.orientation
      );
      ok(aabb);
      return {
        player: event.id,
        entityId: newId(),
        terrain: q
          .byKeys("terrainByShardId", ...involvedShards(aabbToBox(aabb)))
          .terrain(),
        acl: aclChecker(
          {
            kind: "aabb",
            aabb: integerAABB(aabb),
          },
          event.id
        ),
      };
    },
    apply: ({ player, entityId, terrain, acl }, event, context) => {
      const inventory = new PlayerInventoryEditor(context, player);
      const slot = inventory.get(event.inventory_ref);
      const itemId = slot?.item.id;
      ok(event.item === itemId);
      if (!slot || !slot?.item.isBlueprint) {
        return;
      }

      if (!acl.canPerformItemAction(anItem(slot.item))) {
        throw new RollbackError(
          `Cannot place ${slot.item.displayName} here due to lack of permissions.`
        );
      }

      inventory.set(event.inventory_ref, undefined);

      checkTerrainForBlueprint(
        context.voxeloo,
        terrain,
        itemId,
        event.position,
        event.orientation
      );

      context.create({
        id: entityId,
        position: Position.create({ v: event.position }),
        orientation: Orientation.create({
          v: event.orientation,
        }),
        blueprint_component: BlueprintComponent.create({
          owner_id: player.id,
          blueprint_id: slot.item.id,
        }),
        expires: Expires.create({
          trigger_at: secondsSinceEpoch() + BLUEPRINT_EXPIRATION_S,
        }),
        collideable: Collideable.create(),
      } as Blueprint);
    },
  }
);

export const destroyBlueprintEventHandler = makeEventHandler(
  "destroyBlueprintEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      blueprint: q.id(event.id),
      dropId: newId(),
    }),
    apply: ({ blueprint, dropId }, event, context) => {
      context.delete(blueprint.id);

      const dropPos = blueprint.position()!.v;
      const itemId = blueprint.blueprintComponent()!.blueprint_id;

      const dropFilter = {
        kind: "only",
        entity_ids: new Set([event.user_id]),
        expiry: secondsSinceEpoch() + CONFIG.gameMinePrioritySecs,
      } as GrabBagFilter;

      context.create(
        newDrop(
          dropId,
          dropPos as Vec3f,
          false,
          [countOf(anItem(itemId))],
          dropFilter
        )
      );
    },
  }
);
