import type { BiomesId } from "@/shared/ids";
import { TimeWindow } from "@/shared/util/throttling";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { GaiaReplica, TerrainShard } from "@/server/gaia_v2/table";
import { Simulation } from "@/server/gaia_v2/simulations/api";
import { requeueAfter } from "@/server/gaia_v2/simulations/api";
import type { Change } from "@/shared/ecs/change";
import type { ShardId } from "@/shared/game/shard";
import { SHARD_SHAPE } from "@/shared/game/shard";
import { voxelShard } from "@/shared/game/shard";
import { FarmingPlantSelector } from "@/shared/ecs/gen/selectors";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type { IdGenerator } from "@/server/shared/ids/generator";
import type { Plant } from "@/server/gaia_v2/simulations/farming/change_batcher";
import { FarmingChangeBatcher } from "@/server/gaia_v2/simulations/farming/change_batcher";
import { bikkieDerived, getBiscuit } from "@/shared/bikkie/active";
import type {
  BaseFarmingPlantTicker,
  FarmingPlantTickContext,
} from "@/server/gaia_v2/simulations/farming/plant_ticker";
import { clearPlayerActions } from "@/server/gaia_v2/simulations/farming/plant_ticker";
import { createTickerForFarmSpec } from "@/server/gaia_v2/simulations/farming/plant_ticker_spec";
import { using, usingAll } from "@/shared/deletable";
import { Tensor } from "@/shared/wasm/tensors";
import { farmLog } from "@/server/gaia_v2/simulations/farming/util";
import { sortBy } from "lodash";
import { log } from "@/shared/logging";

export class FarmingSimulation extends Simulation {
  private changeBatcher: FarmingChangeBatcher;
  private readonly tickFromTerrain: Set<BiomesId> = new Set();
  private plantTickers = new Map<
    BiomesId,
    () => BaseFarmingPlantTicker | undefined
  >();

  // Update slow updates in shards at about once per 10 seconds
  // This is the "tick" interval of plants
  private slowUpdateThrottle = new TimeWindow<BiomesId>(
    CONFIG.farmingShardMinTickIntervalSecs * 1000
  );

  constructor(
    private readonly voxeloo: VoxelooModule,
    private readonly table: GaiaReplica["table"],
    idGenerator: IdGenerator
  ) {
    super("farming");
    this.changeBatcher = new FarmingChangeBatcher(voxeloo, table, idGenerator);
  }

  invalidate(change: Change): ShardId[] {
    if (change.kind === "delete") {
      return [];
    }

    // Plant update (from players or elsewhere)
    if (
      (change.kind === "update" || change.kind === "create") &&
      change.entity.farming_plant_component
    ) {
      const pos =
        change.entity.position?.v ||
        this.table.get(change.entity.id)?.position?.v;
      // updated elsewhere; don't promote fast tick
      this.tickFromTerrain.delete(change.entity.id);
      const shards = pos ? [voxelShard(...pos)] : [];
      return shards;
    }

    // Terrain changes
    if (change.kind === "update" && change.entity.shard_placer) {
      // Scan for any inconsistencies between farming and placer id
      // (Is this too much processing?)
      const delta = change.entity;
      const entity = this.table.get(change.entity.id);
      const changedIds: Set<BiomesId> = new Set();
      usingAll(
        [
          Tensor.make(this.voxeloo, SHARD_SHAPE, "F64"),
          Tensor.make(this.voxeloo, SHARD_SHAPE, "F64"),
        ],
        (placer, farming) => {
          placer.load(delta.shard_placer?.buffer);
          farming.load(
            delta.shard_farming?.buffer ?? entity?.shard_farming?.buffer
          );
          // If placer differs from farming, this was an edit by not-farming.
          // We need to invalidate the farming entities.
          for (const [pos, farmingId] of farming) {
            const placerId = placer.get(...pos);
            if (placerId !== farmingId) {
              changedIds.add(farmingId as BiomesId);
            }
          }
        }
      );
      // Return shards that that contain the root of the plant
      const shardIds = [];
      for (const id of changedIds) {
        const entity = this.table.get(id);
        const pos = entity?.position?.v;
        if (pos) {
          shardIds.push(voxelShard(...pos));
        }
        this.tickFromTerrain.add(id);
      }
      return shardIds;
    }
    return [];
  }

  async update(shard: TerrainShard) {
    // Find all farming entities in this shard
    const shardId = voxelShard(...shard.box.v0);

    // For all plants, determine if we need to do fast or slow updates
    const fastUpdates: BiomesId[] = [];
    const slowUpdates: BiomesId[] = [];
    const timeSeconds = secondsSinceEpoch();
    const tickTimes = new Map<BiomesId, number>();
    let hasGrowingPlants = false;
    for (const entity of this.table.scan(
      FarmingPlantSelector.query.key(shardId)
    )) {
      const plantComponent = entity.farming_plant_component;
      const canSlowTick =
        timeSeconds - plantComponent.last_tick >
        CONFIG.farmingPlantMinTickIntervalSecs;
      const isTransitioning =
        (canSlowTick &&
          plantComponent.status === "growing" &&
          plantComponent.next_stage_at &&
          plantComponent.next_stage_at < timeSeconds) ||
        plantComponent.status === "planted";

      tickTimes.set(entity.id, plantComponent.last_tick);
      if (
        this.tickFromTerrain.has(entity.id) ||
        plantComponent.player_actions?.length ||
        isTransitioning
      ) {
        fastUpdates.push(entity.id);
      } else if (canSlowTick) {
        slowUpdates.push(entity.id);
      }

      hasGrowingPlants =
        hasGrowingPlants ||
        plantComponent.status === "growing" ||
        plantComponent.status === "planted";
    }

    let updates = [...sortBy(fastUpdates, (id) => tickTimes.get(id))];
    // Throttle slow updates
    const doSlowUpdates = !this.slowUpdateThrottle.throttleOrUse(shard.id);
    if (doSlowUpdates) {
      updates.push(...sortBy(slowUpdates, (id) => tickTimes.get(id)));
    }

    // If we have plants growing, schedule a slow tick
    // Note: we can be more efficient here if we use the plant's next_stage_at
    // instead
    let res = hasGrowingPlants
      ? requeueAfter(this.slowUpdateThrottle.windowSizeMs)
      : {};

    // No updates, just exit
    if (!updates.length) {
      return res;
    }

    // Bound # of updates
    updates = updates.slice(0, CONFIG.farmingPlantsPerTick);

    // Tick plants
    const ctx = {
      changeBatcher: this.changeBatcher,
      timeSeconds,
    };
    let ticked = 0;
    for (const plantId of updates) {
      const plant = this.changeBatcher.getPlant(plantId);
      if (plant) {
        this.tickFromTerrain.delete(plantId);
        await this.tickPlant({ ...ctx, plant });
        ticked++;
      }
    }
    farmLog(
      `Shard ${shard.id} ticked ${ticked} plants. ${
        doSlowUpdates ? "(With Slow Updates)" : ""
      }`,
      2
    );
    const changes = await this.changeBatcher.flush();
    res = {
      ...res,
      changes,
    };

    if (ticked < fastUpdates.length) {
      // Requeue as soon as we can if we have unprocessed fast updates
      const requeueTime = CONFIG.gaiaShardThrottleMs.find(
        (t) => t[0] === this.name
      )?.[1];
      if (requeueTime) {
        res = {
          ...res,
          ...requeueAfter(requeueTime),
        };
      }
    }

    const maxNumChanges = changes
      .map((c) => c.changes?.length ?? 0)
      .reduce((a, b) => Math.max(a, b), 0);
    if (maxNumChanges > CONFIG.farmingWarnApplyBatchSize) {
      log.error(
        `Farming update batch too large (max ${maxNumChanges} over ${changes.length} merged changes) on ${shard.id}.`
      );
      log.error(`${ticked} plants were ticked; lower farmingPlantsPerTick`);
    }

    return res;
  }

  tickerForPlant(plant: Plant) {
    const seed = plant.entity.farmingPlantComponent()?.seed;
    if (!seed) {
      return;
    }
    if (!this.plantTickers.has(seed)) {
      this.plantTickers.set(
        seed,
        bikkieDerived("plantTicker", (): BaseFarmingPlantTicker | undefined =>
          createTickerForFarmSpec(
            this.voxeloo,
            getBiscuit(seed)?.farming,
            this.table
          )
        )
      );
    }
    return this.plantTickers.get(seed)?.();
  }

  async tickPlant(ctx: FarmingPlantTickContext) {
    const plant = ctx.plant;
    const ticker = this.tickerForPlant(plant);
    if (ticker) {
      const plantComponent = plant.entity.mutableFarmingPlantComponent();
      const secondsSinceLastTick = ctx.timeSeconds - plantComponent.last_tick;
      const prevBlob = plantComponent.expected_blocks;
      const ticked = ticker.tick(ctx, secondsSinceLastTick);
      if (plantComponent?.player_actions.length) {
        clearPlayerActions(plantComponent);
      }
      if (ticked) {
        // Delete entity if there are no blocks left
        const newBlob =
          ctx.plant.entity.farmingPlantComponent()?.expected_blocks;
        if (prevBlob !== newBlob) {
          let hasAnyBlocks = false;
          using(ticker.expectedBlocks(ctx), (tensor) => {
            for (const [_pos, block] of tensor) {
              if (block) {
                hasAnyBlocks = true;
              }
            }
          });
          if (!hasAnyBlocks) {
            farmLog(
              `Plant ${plant.id} has no blocks. Destroyed. Removing entity`
            );
            plant.destroy = true;
          }
        }
      }
    }
    plant.entity.mutableFarmingPlantComponent().last_tick = ctx.timeSeconds;
  }
}
