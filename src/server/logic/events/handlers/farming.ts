import {
  aclChecker,
  makeEventHandler,
  newIds,
} from "@/server/logic/events/core";
import type { QueriedEntity } from "@/server/logic/events/query";
import { q } from "@/server/logic/events/query";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { decrementItemDurability } from "@/server/logic/utils/durability";
import {
  decrementItemWaterAmount,
  restoreItemWaterAmount,
} from "@/server/logic/utils/water_amount";
import { getTerrainID } from "@/shared/asset_defs/terrain";
import { terrainIdToBlock } from "@/shared/bikkie/terrain";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type { FarmingPlant } from "@/shared/ecs/gen/entities";
import type { PlantSeedEvent, WaterPlantEvent } from "@/shared/firehose/events";
import { blockDestructionTimeMs } from "@/shared/game/damage";
import { tilledSoilIsomorphism } from "@/shared/game/farming";
import type { Item } from "@/shared/game/item";
import { anItem } from "@/shared/game/item";
import { countOf, createBag } from "@/shared/game/items";
import { getPlayerBuffsByComponents } from "@/shared/game/players";
import { voxelShard, worldPos } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { sub } from "@/shared/math/linear";
import { ok } from "assert";

function getPlayerBuffsByEntity(entity: QueriedEntity) {
  return getPlayerBuffsByComponents({
    buffsComponent: entity.buffsComponent(),
    wearing: entity.wearing(),
    selectedItem: entity.selectedItem(),
  });
}

export const tillSoilEventHandler = makeEventHandler("tillSoilEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => {
    return {
      terrain: q.ids(event.shard_ids).terrain(),
      player: q.id(event.id).with("inventory", "player_behavior"),
      occupiedBy: q.ids(event.occupancy_ids)?.includeIced(),
      acl: aclChecker({ kind: "points", points: event.positions }, event.id),
    };
  },
  apply: ({ terrain, player, occupiedBy, acl }, event, context) => {
    if (!acl.can("tillSoil")) {
      return;
    }

    // Verify event.
    const occupancyIdSet = new Set(event.occupancy_ids);
    const terrainIdMap = new Map(terrain.map((t) => [t.shardId, t]));
    const blocks: Item[] = [];
    for (const position of event.positions) {
      const shardId = voxelShard(...position);
      const shardPos = sub(position, worldPos(shardId));
      if (!terrainIdMap.has(shardId)) {
        log.warn(
          `Player ${
            event.id
          } tried to till soil at ${position} in shard ${shardId} but the terrain shards in the event are ${[
            ...terrainIdMap.keys(),
          ]}`
        );
        return;
      }
      const terrain = terrainIdMap.get(shardId)!;
      const occupancyId = terrain.occupancy.get(...shardPos);
      if (occupancyId && !occupancyIdSet.has(<BiomesId>occupancyId)) {
        log.warn(
          `Player ${
            event.id
          } tried to till soil at ${position} but did not send the correct occupancy ids. id: ${occupancyId}, sent ${[
            ...occupancyIdSet,
          ]}`
        );
        return;
      }

      const existingTerrainId =
        terrain.diff.get(...shardPos) ?? terrain.seed.get(...shardPos);
      const block = terrainIdToBlock(existingTerrainId);
      if (!block?.isTillable) {
        log.warn(
          `Player ${event.id} tried to till soil at ${position} but the terrain is not tillable`
        );
        return;
      }
      if (block) {
        blocks.push(block);
      }
    }
    for (const occupiedEntity of occupiedBy) {
      // Don't till anything occupied
      if (occupiedEntity?.groupComponent()) {
        log.warn(
          `Player ${event.id} tried to till soil but there was a group entity in the way`
        );
        return;
      }
    }

    // Decrement hoe durability by half of block destroy time
    const inventory = new PlayerInventoryEditor(context, player);
    const slot = inventory.get(event.tool_ref);
    const totalDestroyTime = blocks.reduce(
      (acc, block) => acc + blockDestructionTimeMs(block, slot?.item),
      0
    );
    decrementItemDurability(inventory, event.tool_ref, totalDestroyTime / 2);

    // Modify terrain shard
    const tilledSoilTerrainId = getTerrainID("soil");
    for (const position of event.positions) {
      const shardId = voxelShard(...position);
      const terrain = terrainIdMap.get(shardId)!;
      const shardPos = sub(position, worldPos(terrain.shardId));
      terrain.setTerrainAt(
        shardPos,
        {
          value: tilledSoilTerrainId,
          shapeId: tilledSoilIsomorphism(),
        },
        acl.restoreTimeSecs("tillSoil")
      );
    }

    player.mutablePlayerBehavior().place_event_info = {
      time: secondsSinceEpoch(),
      position: event.positions[0],
    };
    log.info(`Tilled soil at ${event.positions}`);
  },
});

export const plantSeedEventHandler = makeEventHandler("plantSeedEvent", {
  mergeKey: (event) => event.user_id,
  involves: (event) => {
    return {
      terrain: q.terrain(event.id),
      player: q.id(event.user_id).with("inventory", "player_behavior"),
      occupiedBy: q.optional(event.occupancy_id)?.includeIced(),
      plantIds: newIds(1),
      acl: aclChecker({ kind: "point", point: event.position }, event.user_id),
      existingPlant: q.optional(event.existing_farming_id),
    };
  },
  apply: (
    { terrain, player, occupiedBy, plantIds, acl, existingPlant },
    event,
    context
  ) => {
    if (!acl.can("plantSeed")) {
      return;
    }
    const shardId = voxelShard(...event.position);
    const shardPos = sub(event.position, worldPos(shardId));
    const inventory = new PlayerInventoryEditor(context, player);
    const slot = inventory.get(event.seed);
    if (!slot || !slot.item.isSeed) {
      // Not a seed.
      return;
    }

    const occupancyId = terrain.occupancy.get(...shardPos);
    if ((occupancyId ? occupancyId : undefined) !== event.occupancy_id) {
      // Client sent wrong or obsolete occupancy ID.
      return;
    }

    const terrainId =
      terrain.diff.get(...shardPos) ?? terrain.seed.get(...shardPos);
    const block = terrainIdToBlock(terrainId);
    const plantableBlocks = anItem(slot.item.id)?.plantableBlocks;
    if (!block || !plantableBlocks || !plantableBlocks.includes(block.id)) {
      log.info("Attempted to plant on invalid terrain");
      return;
    }

    // Don't plant seeds in groups.
    if (occupiedBy?.groupComponent()) {
      return;
    }

    const farmingId = terrain.farming.get(...shardPos);
    // Don't plant if there's already a plant here.
    if (farmingId) {
      if (event.existing_farming_id === farmingId && !existingPlant) {
        // We have some dangling farming IDs. Detect and allow a plant if
        // the entity doesn't exist
        log.warn(
          `Dangling farming ID ${farmingId} at ${event.position} for player ${event.user_id}. Allowing plant.`
        );
      } else {
        log.info(
          `Attempted to plant seed in occupied plot, occupied by ${farmingId}`
        );
        return;
      }
    }

    // Take one of the seeds
    inventory.takeOrThrow(createBag(countOf(slot.item.id)));

    // Create a new plant entity
    const id = plantIds.pop();
    ok(id, "No plant IDs available");
    const plant: FarmingPlant = {
      id,
      position: { v: event.position },
      farming_plant_component: {
        planter: event.user_id,
        seed: slot.item.id,
        plant_time: secondsSinceEpoch(),
        stage: 0,
        status: "planted",
        stage_progress: 0,
        last_tick: secondsSinceEpoch(),
        water_level: 1,
        wilt: 0,
        expected_blocks: undefined,
        variant: undefined,
        buffs: getPlayerBuffsByEntity(player)
          .filter((buff) => !buff.is_disabled)
          .map((buff) => buff.item_id),
        player_actions: [],
        water_at: undefined,
        fully_grown_at: undefined,
        next_stage_at: undefined,
      },
      container_inventory: { items: [] },
      locked_in_place: {},
    };

    context.create(plant);
    terrain.mutableFarming.set(...shardPos, id);
    log.info(`Farming seed planted: ${slot.item.id} at ${event.position}`);

    context.publish(<PlantSeedEvent>{
      kind: "plantSeed",
      entityId: event.user_id,
      seed: slot.item.id,
    });
  },
});

export const waterPlantsEventHandler = makeEventHandler("waterPlantsEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({
    plants: q.ids(event.plant_ids).with("farming_plant_component"),
    player: q.id(event.id).with("inventory", "player_behavior"),
  }),
  apply({ plants, player }, event, context) {
    const inventory = new PlayerInventoryEditor(context, player);
    const toolSlot = inventory.get(event.tool_ref);
    if (!toolSlot) {
      return;
    }
    for (const plant of plants) {
      const plantWaterLevel = plant.farmingPlantComponent().water_level;
      const waterFromCan = decrementItemWaterAmount(
        inventory,
        event.tool_ref,
        1 - plantWaterLevel
      );

      plant.mutableFarmingPlantComponent().player_actions.push({
        kind: "water",
        amount: waterFromCan,
        timestamp: secondsSinceEpoch(),
      });

      context.publish(<WaterPlantEvent>{
        kind: "waterPlant",
        entityId: event.id,
        seed: plant.farmingPlantComponent().seed,
        amount: waterFromCan,
      });
    }
  },
});

export const replenishWateringCanEventHandler = makeEventHandler(
  "replenishWateringCanEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      terrain: q.terrain(event.id),
      player: q.id(event.user_id).with("inventory", "player_behavior"),
    }),
    apply({ player, terrain }, event, context) {
      const inventory = new PlayerInventoryEditor(context, player);
      const shardId = voxelShard(...event.position);
      const shardPos = sub(event.position, worldPos(shardId));
      const water = terrain.water.get(...shardPos);
      if (water) {
        restoreItemWaterAmount(inventory, event.tool_ref);
        log.info(`Watering can replenished`);
      } else {
        log.warn(`Watering can cannot be replenished: no water`);
      }
    },
  }
);

export const fertilizePlantEventHandler = makeEventHandler(
  "fertilizePlantEvent",
  {
    mergeKey: (event) => event.id,
    involves: (event) => ({
      plant: q.id(event.id).with("farming_plant_component"),
      player: q.id(event.user_id).with("inventory", "player_behavior"),
    }),
    apply({ plant, player }, event, context) {
      // Remove one fertilizer from the player's inventory.
      const inventory = new PlayerInventoryEditor(context, player);
      const slot = inventory.get(event.tool_ref);
      if (!slot) {
        return;
      }
      const fertilizer = countOf(slot.item.id);
      inventory.takeOrThrow(createBag(fertilizer));

      plant.mutableFarmingPlantComponent().player_actions.push({
        kind: "fertilize",
        fertilizer: fertilizer.item,
        timestamp: secondsSinceEpoch(),
      });
      log.info(`Farming plant fertilized: ${plant.id}`);
    },
  }
);

export const pokePlantEventHandler = makeEventHandler("pokePlantEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({
    plant: q.id(event.id).with("farming_plant_component"),
  }),
  apply({ plant }) {
    plant.mutableFarmingPlantComponent().player_actions.push({
      kind: "poke",
      timestamp: secondsSinceEpoch(),
    });
  },
});
