import type {
  EventContext,
  InvolvedKeysFor,
  InvolvedSpecification,
  NewIds,
} from "@/server/logic/events/core";
import {
  RollbackError,
  aclChecker,
  makeEventHandler,
  newIds,
} from "@/server/logic/events/core";
import type { QueriedEntityWith } from "@/server/logic/events/query";
import { q } from "@/server/logic/events/query";
import type { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import {
  MAX_DROPS_FOR_SPEC,
  blockDropTable,
  createDropsForBag,
} from "@/server/logic/utils/drops";
import { decrementItemDurability } from "@/server/logic/utils/durability";
import { serverRuleset } from "@/server/shared/minigames/util";
import type { TerrainID } from "@/shared/asset_defs/terrain";
import { terrainIdToBlockOrDie } from "@/shared/bikkie/terrain";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type { EditEvent, HandlerEditEvent } from "@/shared/ecs/gen/events";
import type { GrabBagFilter, Vec3f } from "@/shared/ecs/gen/types";
import { aclForTerrainPlacement } from "@/shared/game/acls";
import { blockDestructionTimeMs } from "@/shared/game/damage";
import { isFloraId } from "@/shared/game/ids";
import { anItem } from "@/shared/game/item";
import { countOf, createBag, rollLootTable } from "@/shared/game/items";
import { blockPos } from "@/shared/game/shard";
import { isMucky } from "@/shared/game/terrain_helper";
import type { BiomesId } from "@/shared/ids";
import type { GameStateContext } from "@/shared/loot_tables/indexing";
import { add } from "@/shared/math/linear";
import { createCounter } from "@/shared/metrics/metrics";

const worldVoxelsPlaced = createCounter({
  name: "game_world_voxels_placed",
  help: "Number of voxels placed in the world",
});
const worldVoxelsRemoved = createCounter({
  name: "game_world_voxels_removed",
  help: "Number of voxels removed from the world",
});

function handleBlockDrops<
  TInvolvedSpecification extends InvolvedSpecification,
  TKey extends InvolvedKeysFor<TInvolvedSpecification, NewIds>
>(
  context: EventContext<TInvolvedSpecification>,
  keyForDrops: TKey,
  inventory: PlayerInventoryEditor,
  position: Vec3f,
  terrainId: TerrainID,
  event: EditEvent,
  gameStateContext: GameStateContext
) {
  const block = terrainIdToBlockOrDie(terrainId);
  const toolSlot = inventory.get(event.tool_ref);
  const blockDestroyTimeMs = blockDestructionTimeMs(block, toolSlot?.item);

  // Handle inventory side-effects; decrement tool durability if it was a delete
  decrementItemDurability(inventory, event.tool_ref, blockDestroyTimeMs);

  // Send a ECS event
  context.publish({
    kind: "blockDestroy",
    entityId: event.user_id,
    block,
    tool: toolSlot?.item,
    position: position,
  });

  // Allow only the person who broke the block to take the item.
  const dropFilter = {
    kind: "only",
    entity_ids: new Set([event.user_id]),
    expiry: secondsSinceEpoch() + CONFIG.gameMinePrioritySecs,
  } as GrabBagFilter;

  const bag = rollLootTable(blockDropTable(), gameStateContext);
  createDropsForBag(
    context,
    keyForDrops,
    bag,
    add(position, [0.5, 0.5, 0.5]),
    true,
    dropFilter
  );
}

function takeForEditEvent(
  inventory: PlayerInventoryEditor,
  event: HandlerEditEvent
) {
  if (event.value === 0) {
    return;
  }
  const bag = createBag(countOf(terrainIdToBlockOrDie(event.value), 1n));

  const pattern =
    inventory.patternForTakeFromSelected(bag) ??
    inventory.determineTakePattern(bag);
  if (!pattern) {
    throw new RollbackError(
      "Attempted to place a voxel that they didn't have in their inventory."
    );
  }
  inventory.take(pattern);
}

export function maybeHandleBlueprintCompletion(
  event: { user_id: BiomesId; position: Vec3f; blueprint_completed?: boolean },
  blueprint: QueriedEntityWith<"id" | "blueprint_component"> | undefined,
  context: EventContext<{}>
) {
  if (blueprint && event.blueprint_completed) {
    const blueprintId = blueprint.blueprintComponent().blueprint_id;
    if (anItem(blueprintId).isTemplate) {
      context.publish({
        kind: "blueprintBuilt",
        entityId: event.user_id,
        blueprint: blueprintId,
        position: event.position,
      });
      context.delete(blueprint.id);
    }
  }
}

export const editEventHandler = makeEventHandler("editEvent", {
  prepareInvolves: (event) => ({
    player: q.id(event.user_id),
  }),
  prepare: ({ player }) => ({
    activeMinigameInstanceId: player.playing_minigame?.minigame_instance_id,
    activeMinigameId: player.playing_minigame?.minigame_id,
  }),
  mergeKey: (event) => event.user_id,
  involves: (event, { activeMinigameId, activeMinigameInstanceId }) => {
    return {
      terrain: q.terrain(event.id),
      player: q.player(event.user_id),
      dropIds: newIds(MAX_DROPS_FOR_SPEC),
      blueprint: q
        .optional(event.blueprint_entity_id)
        ?.with("blueprint_component"),
      minigame:
        activeMinigameId &&
        q.optional(activeMinigameId).with("minigame_component"),
      minigameInstance:
        activeMinigameInstanceId &&
        q.optional(activeMinigameInstanceId).with("minigame_instance"),
      acl: aclChecker(
        {
          kind: "point",
          point: [...event.position],
        },
        event.user_id
      ),
    };
  },
  apply: (
    { terrain, player, blueprint, minigame, minigameInstance, acl },
    event,
    context
  ) => {
    const ruleset = serverRuleset(
      {},
      player.delta(),
      minigame,
      minigameInstance
    );

    const action = aclForTerrainPlacement(event.value);
    if (
      !acl.can(action) &&
      !ruleset.overrideAcl(action, {
        atPoints: [event.position],
      })
    ) {
      return;
    }

    const shardPos = blockPos(...event.position);

    const existingTerrainId = terrain.terrainAt(shardPos);
    if (existingTerrainId === 0 && event.value === 0) {
      return;
    }
    if (existingTerrainId !== 0 && event.value !== 0) {
      // We're attempting to replace one block with another. Unless the
      // replacement block is flora, this must happen as two separate events.
      if (!isFloraId(existingTerrainId)) {
        return;
      }
    }

    // Don't allow destroying groups.
    if (!!terrain.occupancy.get(...shardPos)) {
      return;
    }

    if (!player.gremlin()) {
      takeForEditEvent(player.inventory, event);
    }

    // Handle deletion side-effects
    if (event.value === 0) {
      const isUserPlacedBlock = !!terrain.placer.get(...shardPos);

      // Sample the muckyness at this location. For drops, we need to account
      // for the dithering effect so we zero-out this value if the specific
      // location is not considered mucky.
      const muck = terrain.muck.get(...shardPos);

      // Don't drop if there is a plant here
      if (ruleset.canDropAt(terrain, event.position)) {
        const toolSlot = player.inventory.get(event.tool_ref);
        handleBlockDrops(
          context,
          "dropIds",
          player.inventory,
          event.position,
          existingTerrainId,
          event,
          {
            block: terrainIdToBlockOrDie(existingTerrainId).id,
            toolDestroyerClass: toolSlot?.item?.destroyerClass,
            seedBlock: !isUserPlacedBlock,
            toolHardnessClass: toolSlot?.item?.hardnessClass,
            muck: isMucky(shardPos, muck) ? muck : 0,
            positionX: event.position[0],
            positionY: event.position[1],
            positionZ: event.position[2],
            // TODO
            //timeOfDay
          }
        );
      }

      worldVoxelsRemoved.inc();
    } else {
      // Let everyone know about the fact that the player took an action.
      player.mutablePlayerBehavior().place_event_info = {
        time: secondsSinceEpoch(),
        position: event.position,
      };

      context.publish({
        kind: "place" as const,
        entityId: event.user_id,
        item: terrainIdToBlockOrDie(event.value),
        position: event.position,
      });
      worldVoxelsPlaced.inc();
    }

    let restoreTimeSecs = acl.restoreTimeSecs(action);
    if (
      (restoreTimeSecs === undefined || !isFinite(restoreTimeSecs)) &&
      player.gremlin()
    ) {
      restoreTimeSecs = CONFIG.gremlinsBuildRestoreTimeSecs;
    }

    if (event.value === 0) {
      terrain.clearTerrainAt(shardPos, restoreTimeSecs);
    } else {
      terrain.setTerrainAt(
        shardPos,
        {
          value: event.value,
          placerId: event.user_id,
        },
        restoreTimeSecs
      );
    }

    maybeHandleBlueprintCompletion(event, blueprint, context);
  },
});
