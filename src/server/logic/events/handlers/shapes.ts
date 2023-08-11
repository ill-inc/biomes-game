import { aclChecker, makeEventHandler } from "@/server/logic/events/core";
import { maybeHandleBlueprintCompletion } from "@/server/logic/events/handlers/edits";
import { q } from "@/server/logic/events/query";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { decrementItemDurability } from "@/server/logic/utils/durability";
import { terrainShapeable } from "@/shared/asset_defs/quirk_helpers";
import { getShaper } from "@/shared/asset_defs/shapers";
import type { Isomorphism } from "@/shared/asset_defs/shapes";
import {
  getShapeID,
  getShapeName,
  isomorphismShape,
} from "@/shared/asset_defs/shapes";
import { terrainIdToBlockOrDie } from "@/shared/bikkie/terrain";
import { blockShapeTimeMs } from "@/shared/game/damage";
import type { Item } from "@/shared/game/item";
import * as Shards from "@/shared/game/shard";
import { log } from "@/shared/logging";

// Resolves the name of the shape corresponding to the given isomorphism, and
// enforces that this is a valid shape that can be produced by the given item.
function resolveShapeName(item: Item, isomorphism: Isomorphism) {
  const requestedShape = isomorphismShape(isomorphism);
  if ((item.shape || item.shaper) && requestedShape === getShapeID("full")) {
    return getShapeName(requestedShape);
  } else if (item.shape) {
    if (getShapeID(item.shape) === requestedShape) {
      return getShapeName(requestedShape);
    }
  } else if (item.shaper) {
    const shaper = getShaper(item.shaper);
    if (shaper && shaper.has(requestedShape)) {
      return getShapeName(requestedShape);
    }
  }
}

export const shapeEventHandler = makeEventHandler("shapeEvent", {
  involves: (event) => {
    return {
      terrain: q.terrain(event.id),
      player: event.user_id,
      blueprint: q
        .optional(event.blueprint_entity_id)
        ?.with("blueprint_component"),
      acl: aclChecker({ kind: "point", point: event.position }, event.user_id),
    };
  },
  apply: ({ terrain, player, blueprint, acl }, event, context) => {
    if (!acl.can("shape")) {
      return;
    }

    const inventory = new PlayerInventoryEditor(context, player);
    const toolSlot = inventory.get(event.tool_ref);
    if (toolSlot === undefined) {
      log.warn("Unknown tool used to attempt shaping - skipping");
      return;
    }

    const shapeName = resolveShapeName(toolSlot.item, event.isomorphism);
    if (shapeName === undefined) {
      log.warn("Tool used to attempt shaping has no shape - skipping");
      return;
    }

    const blockPos = Shards.blockPos(...event.position);
    const terrainID = terrain.terrainAt(blockPos);

    // Don't allow shaping group voxels or placeables.
    if (!!terrain.occupancy.get(...blockPos)) {
      return;
    }

    // Don't allow shaping non-shapeable terrain (e.g. flora).
    if (!terrainID || !terrainShapeable(terrainID)) {
      return;
    }

    const block = terrainIdToBlockOrDie(terrainID);
    const shapeTimeMs = blockShapeTimeMs(block, toolSlot.item);
    if (shapeTimeMs === undefined || !isFinite(shapeTimeMs)) {
      log.warn(`Infinite shape time for ${terrainID} - skipping`);
      return;
    }

    // Update the terrain tensors to reflect the new shape.
    terrain.setTerrainAt(
      blockPos,
      { shapeId: event.isomorphism },
      acl.restoreTimeSecs("shape")
    );

    // Update tool durability.
    decrementItemDurability(inventory, event.tool_ref, shapeTimeMs);

    // Publish the event to the firehose.
    context.publish({
      kind: "shapeBlock",
      entityId: event.user_id,
      shapeName,
      position: event.position,
    });

    maybeHandleBlueprintCompletion(event, blueprint, context);
  },
});
