import {
  blockDropTable,
  legacyDropSpecToLootEntries,
  newDrop,
} from "@/server/logic/utils/drops";
import { terrainIdToBlock } from "@/shared/bikkie/terrain";
import { using } from "@/shared/deletable";
import type { Vec3i } from "@/shared/ecs/gen/types";
import type { GrowSeedEvent } from "@/shared/firehose/events";
import { anItem } from "@/shared/game/item";
import { countOf, rollLootTable } from "@/shared/game/items";
import { getPlayerModifiersFromBuffIds } from "@/shared/game/players";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { log } from "@/shared/logging";
import { rollProbabilityTable } from "@/shared/loot_tables/probability_table";
import { add } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import { compactMap } from "@/shared/util/collections";
import { Tensor } from "@/shared/wasm/tensors";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";
import { compact } from "lodash";
import { crossbreedDropTable } from "@/server/gaia_v2/simulations/farming/crossbreeding";
import type { GrowthStage } from "@/server/gaia_v2/simulations/farming/growth_specs";
import {
  VOLUME_TENSOR_ANCHOR,
  VOLUME_TENSOR_SHAPE,
} from "@/server/gaia_v2/simulations/farming/growth_specs";
import type {
  BaseFarmingPlantTicker,
  FarmingPlantTickContext,
} from "@/server/gaia_v2/simulations/farming/plant_ticker";
import {
  handlePlayerAction,
  clearPlayerActions,
  applyFertilizerBuffs,
  handleWaterActions,
  wiltAndProgress,
} from "@/server/gaia_v2/simulations/farming/plant_ticker";
import type {
  GrowthFarmingTickerSpec,
  GrowthFarmingStage,
} from "@/server/gaia_v2/simulations/farming/plant_ticker_spec";
import { farmLog } from "@/server/gaia_v2/simulations/farming/util";
import { FarmingPlantTerrainModifier } from "@/server/gaia_v2/simulations/farming/terrain_modifier";
import { GrowthTransition } from "@/server/gaia_v2/simulations/farming/growth";

export class FarmingGrowthPlantTicker implements BaseFarmingPlantTicker {
  transitions = new Map<number, GrowthTransition>();
  rewardStage: number;
  rollSeedStage: number;

  constructor(
    private readonly voxeloo: VoxelooModule,
    public readonly spec: GrowthFarmingTickerSpec
  ) {
    // Go through specs and find the first stage that rewards/rolls seeds.
    // That's our seed reward/roll stage.
    // Default to final stage if undefined.
    this.rewardStage = spec.stages.findIndex((stage) => stage.acquireRewards);
    if (this.rewardStage === -1) {
      this.rewardStage = spec.stages.length - 1;
    }

    this.rollSeedStage = spec.stages.findIndex((stage) => stage.rollSeed);
    if (this.rollSeedStage === -1) {
      this.rollSeedStage = this.rewardStage;
    }
  }

  getStageSpec(stage: number): GrowthFarmingStage | undefined {
    if (stage < 0 || stage >= this.spec.stages.length) {
      return;
    }
    return this.spec.stages[stage];
  }

  getGrowthStage(stage: number): GrowthStage | undefined {
    return this.getStageSpec(stage)?.growthStage;
  }

  getGrowthTransition(stage: number) {
    if (!this.transitions.has(stage)) {
      // Create a new transition from the previos stage
      const prevStage = this.getGrowthStage(stage - 1);
      const curStage = this.getGrowthStage(stage);
      if (curStage) {
        this.transitions.set(
          stage,
          new GrowthTransition(this.voxeloo, curStage, prevStage)
        );
      }
    }
    return this.transitions.get(stage);
  }

  expectedBlocks(context: FarmingPlantTickContext): Tensor<"U32"> {
    // Maybe should cache by blob
    const tensor = Tensor.make(this.voxeloo, this.tensorShape(context), "U32");
    const { plant } = context;
    const expectedBlob =
      plant.entity.mutableFarmingPlantComponent().expected_blocks;
    tensor.load(expectedBlob);
    return tensor;
  }
  tensorAnchor(context: FarmingPlantTickContext): Vec3i {
    const entityPos = context.plant.entity.position()?.v;
    ok(entityPos, "Entity must have a position");
    return add(VOLUME_TENSOR_ANCHOR, entityPos);
  }

  tensorShape(_context: FarmingPlantTickContext): Vec3i {
    return VOLUME_TENSOR_SHAPE;
  }

  futureStageGrowthTimeMs(stage: number) {
    let remainingTime = 0;
    // Go through the next stages and add their time.
    for (let i = stage + 1; i < this.spec.stages.length; i++) {
      const stageSpec = this.getStageSpec(i);
      if (stageSpec) {
        remainingTime += stageSpec.timeMs ?? 0;
      }
    }
    return remainingTime;
  }

  addSeedLoot(context: FarmingPlantTickContext) {
    const { plant, changeBatcher } = context;
    const plantComponent = plant.entity.mutableFarmingPlantComponent();

    // Look at direct neighbors for other plants.
    const plantPos = plant.entity.position()?.v;
    if (!plantPos) {
      return;
    }
    const neighborPos = [
      add(plantPos, [1, 0, 0]),
      add(plantPos, [-1, 0, 0]),
      add(plantPos, [0, 0, 1]),
      add(plantPos, [0, 0, -1]),
    ];

    const neighborPlantIds = new Set<BiomesId>();
    for (const pos of neighborPos) {
      // For each neighbor pos, first check direct neighbor.
      // If there are none, check 1 block vertically (on Y).
      // However, always use only 1 block from each X/Z direction
      const verticalPos = [pos, add(pos, [0, 1, 0]), add(pos, [0, -1, 0])];
      const ids = verticalPos
        .map((pos) => changeBatcher.getTerrainFarming(pos))
        .filter((id) => id && id !== plant.id);
      if (ids.length) {
        neighborPlantIds.add(ids[0] as BiomesId);
      }
    }
    const neighborEntities = compactMap(neighborPlantIds, (id) =>
      changeBatcher.getPlant(id)
    );
    const neighborSeeds = compactMap(
      neighborEntities,
      (plant) => plant.entity.farmingPlantComponent()?.seed
    );
    const modifiers = getPlayerModifiersFromBuffIds(plantComponent.buffs);
    const dropTable = crossbreedDropTable(
      plantComponent.seed,
      neighborSeeds,
      modifiers.farmingCrossbreed.increase / 100
    );
    // Roll one, and add it to the entity's inventory
    const seed = rollProbabilityTable(dropTable) ?? undefined;
    farmLog(
      `    Crossbreeding: ${
        anItem(plantComponent.seed).displayName
      } + ${neighborSeeds.map((id) => anItem(id).displayName)} => ${
        anItem(seed)?.displayName
      }`,
      4
    );
    if (seed && seed !== INVALID_BIOMES_ID) {
      // Rolled a crossbreed. Add it to the container
      plant.entity.mutableContainerInventory().items.push(countOf(seed));
    } else if (this.spec.seedDropTable) {
      // Didn't roll a crossbreed. Roll the seed's normal drop table
      const table = legacyDropSpecToLootEntries(this.spec.seedDropTable);
      const loot = rollLootTable(table);
      plant.entity.mutableContainerInventory().items.push(...loot.values());
    }
  }

  advanceStage(
    context: FarmingPlantTickContext,
    newStage?: number,
    forceFinish = false
  ) {
    const plantComponent = context.plant.entity.mutableFarmingPlantComponent();

    if (forceFinish) {
      const transition = this.getGrowthTransition(plantComponent.stage ?? 0);
      if (transition) {
        using(this.terrainModifier(context), (modifier) => {
          transition.forceFinish(modifier);
        });
      }
    }

    newStage ??= (plantComponent.stage ?? 0) + 1;
    if (newStage >= this.spec.stages.length) {
      farmLog(`    Plant fully grown.`, 3);
      plantComponent.status = "fully_grown";
      // Emit event
      context.plant.events.push(<GrowSeedEvent>{
        kind: "growSeed",
        entityId: plantComponent.planter,
        seed: plantComponent.seed,
        plant: context.plant.id,
      });
    } else {
      plantComponent.stage = newStage;
      plantComponent.stage_progress = 0;
      plantComponent.status = "growing";
    }

    // On transition to the specified seed stage, determine the seed we'll reward
    if (newStage === this.rollSeedStage) {
      this.addSeedLoot(context);
    }

    // Update name
    const stageSpec = this.getStageSpec(newStage);
    const name = stageSpec?.name ?? this.spec.name;
    context.plant.entity.mutableLabel().text = name;

    // Roll drops from the droptable defined on the new stage
    if (stageSpec?.dropTable) {
      const table = legacyDropSpecToLootEntries(stageSpec.dropTable);
      // Put these items in front of any existing items, like seeds,
      // so they are shown in the drop entity
      context.plant.entity
        .mutableContainerInventory()
        .items.unshift(...rollLootTable(table).values());
    }

    // Match irradiance to stage spec
    // If fully grown, use the last stagespec's irradiance value
    const irradiance =
      plantComponent.status === "fully_grown"
        ? this.getStageSpec(this.spec.stages.length - 1)?.irradiance
        : stageSpec?.irradiance;
    if (irradiance) {
      const color = irradiance.slice(0, 3) as Vec3;
      const intensity = irradiance[3];
      context.plant.entity.mutableIrradiance().color = color;
      context.plant.entity.mutableIrradiance().intensity = intensity;
    } else {
      context.plant.entity.clearIrradiance();
    }
  }

  terrainModifier(
    context: FarmingPlantTickContext
  ): FarmingPlantTerrainModifier {
    return new FarmingPlantTerrainModifier(
      this.voxeloo,
      context.plant,
      context.changeBatcher,
      this.tensorShape(context),
      this.tensorAnchor(context)
    );
  }

  tick(context: FarmingPlantTickContext, secondsSinceLastTick: number) {
    farmLog(`Farming Ticking Growth Plant ${context.plant.id}`, 2);
    const { plant, timeSeconds: curTime } = context;
    const plantComponent = plant.entity.mutableFarmingPlantComponent();
    farmLog(`    (${plant.entity.position()?.v})`, 3);

    const stage = plantComponent.stage ?? 0;
    const stageSpec = this.getStageSpec(stage);
    const transition = this.getGrowthTransition(stage);
    if (!transition) {
      log.error(`    No transition for stage ${stage}`);
      // In this state, just destroy yourself
      this.destroy(context);
      return true;
    }

    // Pokes are a non-op
    handlePlayerAction(plantComponent, "poke", () => {});

    // Handle admin destroy
    handlePlayerAction(plantComponent, "adminDestroy", () => {
      farmLog(`    Admin destroyed`, 3);
      this.destroy(context, true);
    });

    // Check for destroyed blocks.
    using(this.terrainModifier(context), (modifier) => {
      let shouldDestroy = false;
      transition.checkDestroyedBlocks(modifier, (pos, blockId, flags) => {
        farmLog(`    Block destroyed at ${pos} ${blockId} ${flags}`, 3);
        // Clear from expected blocks
        const existing = modifier.get(pos);
        modifier.set(pos, existing?.block || 0, 0, 0, 0, existing?.shape);
        if (flags.required) {
          shouldDestroy = true;
        }
        if (flags.dropBlock) {
          // Drop blocks
          const item = terrainIdToBlock(blockId);
          if (item) {
            const drops = rollLootTable(blockDropTable(), {
              block: item.id,
              seedBlock: false,
              positionX: pos[0],
              positionY: pos[1],
              positionZ: pos[2],
              // TODO: correct values here
              muck: 0,
              toolDestroyerClass: 0,
              toolHardnessClass: 0,
            });
            const items = [...drops.values()];
            if (items.length > 0) {
              context.plant.entitiesToCreate.push(
                newDrop(
                  INVALID_BIOMES_ID,
                  add(pos, [0.5, 0.5, 0.5]),
                  false,
                  items
                )
              );
            }
          }
        }
      });
      // Destroy if we destroyed a required block
      if (shouldDestroy) {
        this.destroy(context);
        transition.death(modifier, plantComponent.stage_progress, 0);
        return;
      }
    });

    // Don't tick if dead or fully grown
    if (
      plantComponent.status === "dead" ||
      plantComponent.status === "fully_grown"
    ) {
      farmLog(`    Plant finished or dead`, 3);
      clearPlayerActions(plantComponent);
      return true;
    }

    // If initial plant, transition to first stage
    if (plantComponent.status === "planted") {
      farmLog(`    New plant. Forcing transition to stage 0`, 3);
      this.advanceStage(context, 0, true);
    }

    if (stageSpec === undefined) {
      farmLog(`    Unknown stage ${stage} on plant ${plant.id}`);
      return true;
    }

    // Handle fertilizer buffs
    applyFertilizerBuffs(plantComponent);
    // Handle water actions
    handleWaterActions(
      plantComponent,
      this.spec.waterIntervalMs,
      stageSpec.requiresWater
    );

    // Check sun requirements
    let meetsSunRequirements = true;
    if (stageSpec.requiresSun !== undefined) {
      // We have some requirement; check
      using(this.terrainModifier(context), (modifier) => {
        if (stageSpec.requiresSun) {
          meetsSunRequirements = transition.canSeeSun(modifier);
        } else {
          meetsSunRequirements = transition.isShaded(modifier);
        }
      });
    }

    if (!meetsSunRequirements) {
      if (stageSpec.requiresSun) {
        plantComponent.status = "halted_sun";
        farmLog(`    Plant growth halted by lack of sun`, 3);
      } else {
        plantComponent.status = "halted_shade";
        farmLog(`    Plant growth halted by lack of shade`, 3);
      }
      return true;
    }
    if (plantComponent.water_level <= 0) {
      plantComponent.status = "halted_water";
      farmLog(`    Plant growth halted by lack of water`, 3);
      return true;
    }
    plantComponent.status = "growing";

    const lastProgress = plantComponent.stage_progress;
    const excessProgressMs = wiltAndProgress(
      plantComponent,
      curTime * 1000,
      secondsSinceLastTick * 1000,
      this.spec.waterIntervalMs,
      stageSpec.timeMs,
      this.spec.deathTimeMs,
      this.futureStageGrowthTimeMs(stage)
    );

    if (plantComponent.wilt >= 1.0 && stageSpec.canWilt !== false) {
      plantComponent.status = "dead";
      plantComponent.stage_progress = 0;
    }

    using(this.terrainModifier(context), (modifier) => {
      const status = plantComponent.status;
      if (status === "growing") {
        transition.progress(
          modifier,
          lastProgress,
          plantComponent.stage_progress,
          plantComponent.water_level
        );
        if (plantComponent.water_level <= 0) {
          transition.wilt(
            modifier,
            plantComponent.stage_progress,
            plantComponent.water_level
          );
        }
      } else if (status === "dead") {
        transition.death(modifier, plantComponent.stage_progress, 0);
      } else if (status === "fully_grown") {
        // Unwilt if we are wilted
        // This addresses a corner case where a plant wilts in the same tick
        // as finishing growth
        transition.unwilt(modifier, 1.0, 1.0);
      }
    });

    if (plantComponent.stage_progress >= 1.0) {
      farmLog(`    Plant finished stage ${stage}.`, 3);
      this.advanceStage(context);
    }

    if (excessProgressMs > 0) {
      // If we have excess progress after ticking, tick again.
      farmLog(
        `    Recursive tick due to excess progress: ${excessProgressMs}ms`,
        3
      );
      this.tick(context, excessProgressMs / 1000);
    }
    return true;
  }

  destroy(context: FarmingPlantTickContext, destroyBlocks = false) {
    farmLog(`    Plant destroyed.`, 3);
    const { plant } = context;
    const plantComponent = plant.entity.mutableFarmingPlantComponent();
    const transition = this.getGrowthTransition(plantComponent.stage ?? 0);
    if (transition) {
      using(this.terrainModifier(context), (modifier) => {
        transition.destroy(modifier, destroyBlocks);
      });
    } else {
      log.error(
        `No transition for stage ${plantComponent.stage} in destroy. Relinquishing blocks.`
      );
      using(this.terrainModifier(context), (modifier) => {
        modifier.relinquish();
      });
    }

    // Drop any items accumulated, if past the reward stage
    // TODO: drop from specific blocks in the plant
    const rootPos = plant.entity.position()?.v;
    const dropPos = rootPos && add(rootPos, [0.5, 1.5, 0.5]);
    if (dropPos) {
      const plantComponent = plant.entity.mutableFarmingPlantComponent();
      if (
        plantComponent.stage > this.rewardStage ||
        plantComponent.status === "fully_grown"
      ) {
        const items = compact(plant.entity.mutableContainerInventory().items);
        if (items.length > 0) {
          farmLog("    Dropping items", 4, { items, dropPos });
          plant.entitiesToCreate.push(
            newDrop(INVALID_BIOMES_ID, dropPos, false, items)
          );
        }
      } else if (this.spec.partialGrowthDropTable) {
        // Reward partial drops
        const partialTable = legacyDropSpecToLootEntries(
          this.spec.partialGrowthDropTable
        );
        const items = [...rollLootTable(partialTable).values()];
        if (items.length > 0) {
          farmLog("    Dropping items (Partial Growth)", 4, { items, dropPos });
          plant.entitiesToCreate.push(
            newDrop(INVALID_BIOMES_ID, dropPos, false, items)
          );
        }
      }
    }
  }
}
