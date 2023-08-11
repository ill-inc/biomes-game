import type { FarmingPlantComponent } from "@/shared/ecs/gen/components";
import type {
  FarmingPlayerAction,
  Item,
  ReadonlyVec3i,
  Vec3i,
} from "@/shared/ecs/gen/types";
import type { FertilizerEffect } from "@/shared/game/farming";
import { days, hours, minutes } from "@/shared/game/farming";
import { getPlayerModifiersFromBuffIds } from "@/shared/game/players";
import { add, sub } from "@/shared/math/linear";
import type { Tensor } from "@/shared/wasm/tensors";
import { clamp, flatMap, toNumber } from "lodash";
import type {
  FarmingChangeBatcher,
  Plant,
} from "@/server/gaia_v2/simulations/farming/change_batcher";
import { farmLog } from "@/server/gaia_v2/simulations/farming/util";

export interface FarmingPlantTickContext {
  plant: Plant;
  changeBatcher: FarmingChangeBatcher;
  timeSeconds: number;
}

export interface BaseFarmingPlantTicker {
  tick(_context: FarmingPlantTickContext, deltaSeconds: number): boolean;

  expectedBlocks(_context: FarmingPlantTickContext): Tensor<"U32">;
  // Tensor anchor is the position of (0,0,0) of the tensor in world space.
  tensorAnchor(_context: FarmingPlantTickContext): Vec3i;
  tensorShape(_context: FarmingPlantTickContext): Vec3i;
}

export function clearPlayerActions(plantComponent: FarmingPlantComponent) {
  plantComponent.player_actions = [];
}

export function handlePlayerAction<T, K extends FarmingPlayerAction["kind"]>(
  plantComponent: FarmingPlantComponent,
  action: K,
  callback: (actions: Extract<FarmingPlayerAction, { kind: K }>[]) => T
) {
  const actions = plantComponent.player_actions.filter(
    (a) => a.kind === action
  );
  let ret: T | undefined;
  if (actions.length > 0) {
    ret = callback(actions as Extract<FarmingPlayerAction, { kind: K }>[]);
  }
  plantComponent.player_actions = plantComponent.player_actions.filter(
    (a) => a.kind !== action
  );
  return ret;
}

export function handleFertilizer<
  CallbackReturn,
  Kind extends FertilizerEffect["kind"],
  CallbackType extends Extract<FertilizerEffect, { kind: Kind }> & {
    item: Item;
  }
>(
  plantComponent: FarmingPlantComponent,
  fertilizerKind: Kind,
  callback: (effects: CallbackType[]) => CallbackReturn
) {
  const remaining: FarmingPlayerAction[] = [];
  const effects: CallbackType[] = [];
  for (const action of plantComponent.player_actions) {
    if (
      action.kind === "fertilize" &&
      action.fertilizer.fertilizerEffect &&
      action.fertilizer.fertilizerEffect.kind === fertilizerKind
    ) {
      effects.push(<CallbackType>{
        ...action.fertilizer.fertilizerEffect,
        item: action.fertilizer,
      });
    } else {
      remaining.push(action);
    }
  }
  let ret: CallbackReturn | undefined;
  if (effects.length > 0) {
    ret = callback(effects);
  }
  plantComponent.player_actions = remaining;
  return ret;
}

export function applyFertilizerBuffs(plantComponent: FarmingPlantComponent) {
  // Apply any fertilizer buffs
  handleFertilizer(plantComponent, "buff", (fertilizers) => {
    const fertilizerBuffs = flatMap(fertilizers, (f) =>
      f.buffs.map((b) => b[0])
    );
    farmLog(`    (Fertilizer buff, applying: ${fertilizerBuffs})`, 3);
    plantComponent.buffs.push(...fertilizerBuffs);
  });
}

export function handleWaterActions(
  plantComponent: FarmingPlantComponent,
  waterIntervalMs?: number,
  requiresWater?: boolean
) {
  // Player action: watering.
  handlePlayerAction(plantComponent, "water", (waterActions) => {
    let waterLevel = toNumber(plantComponent.water_level);
    for (const waterAction of waterActions) {
      const waterAmount = clamp(
        toNumber(waterAction.amount),
        0,
        1 - waterLevel
      );
      waterLevel += waterAmount;
    }
    plantComponent.water_level = waterLevel;
    farmLog(`    (Player watered to ${waterLevel * 100}%)`, 3);
  });

  // Water fertilizers
  const waterFromFertilizer =
    waterIntervalMs &&
    handleFertilizer(plantComponent, "water", (waterFertilizers) =>
      waterFertilizers.reduce(
        (acc, fert) => acc + toNumber(fert.timeMs / waterIntervalMs),
        0
      )
    );
  if (waterFromFertilizer) {
    // Water from fertilizer. These allow the water level to go beyond 1
    farmLog(`    (Water from fertilizer: ${waterFromFertilizer})`, 3);
    plantComponent.water_level += waterFromFertilizer;
  }
  if (!requiresWater) {
    plantComponent.water_level = 1;
  }
}

export function wiltAndProgress(
  plantComponent: FarmingPlantComponent,
  curTimeMs: number,
  elapsedTimeMs: number,
  waterIntervalMs?: number,
  progressTimeMs?: number,
  deathTimeMs?: number,
  additionalRemainingGrowthTimeMs?: number
) {
  farmLog(`    ${elapsedTimeMs}ms progressed`, 3);

  // Check for relevant buffs.
  const playerModifiers = getPlayerModifiersFromBuffIds(plantComponent.buffs);
  if (playerModifiers.adminFarmingNoWater.enabled) {
    farmLog(`    (No water buff)`, 3);
    waterIntervalMs = undefined;
  }

  let timeMult = 1;

  if (playerModifiers.adminFarmingFast.enabled) {
    // Modify time passed to be 1 minute -> 1 day
    timeMult = days(1) / minutes(1);
    farmLog(`    (Admin fast farming buff)`, 3);
  }
  if (playerModifiers.farmingSpeed.increase) {
    timeMult = 1 - playerModifiers.farmingSpeed.increase / 100;
    farmLog(
      `    (farming speed buff: ${playerModifiers.farmingSpeed.increase}; ${timeMult} multiplier)`,
      3
    );
  }
  if (timeMult !== 1) {
    elapsedTimeMs *= timeMult;
    farmLog(`    Modified: ${elapsedTimeMs}ms progressed`, 3);
  }

  // Compute progress and wilt progress
  const waterLevel = toNumber(plantComponent.water_level);
  const waterDelta = waterIntervalMs
    ? -elapsedTimeMs / waterIntervalMs
    : undefined;
  const newWaterLevel = waterDelta
    ? Math.max(0, waterLevel + waterDelta)
    : waterLevel;
  if (waterIntervalMs === undefined) {
    farmLog(`    (No water needed)`, 3);
    // Set water level to prevent re-ticking immediately
    plantComponent.water_level = 0.9;
  }
  if (waterDelta) {
    plantComponent.water_level = Math.max(0, waterLevel + waterDelta);
    farmLog(
      `    Water: ${waterLevel} -> ${toNumber(plantComponent.water_level)}`,
      3
    );
  }

  // Progress and wilt time
  // Compute progress time before the water hit 0
  let progressDeltaTimeMs = waterDelta
    ? Math.max(Math.min(waterLevel, -waterDelta) * waterIntervalMs!, 0)
    : elapsedTimeMs;
  // Compute wilt time after the water level hit 0
  const wiltDeltaTimeMs = elapsedTimeMs - progressDeltaTimeMs;
  farmLog(
    `    (Raw) Progress: ${progressDeltaTimeMs}ms, Wilt: ${wiltDeltaTimeMs}ms`,
    3
  );

  // Apply modifications.
  //
  // Time fertilizers
  const progressFromFertilizer = handleFertilizer(
    plantComponent,
    "time",
    (effects) => effects.reduce((tot, effect) => tot + effect.timeMs, 0)
  );
  if (progressFromFertilizer) {
    progressDeltaTimeMs += progressFromFertilizer;
    farmLog(`    (Fertilizer) ${progressFromFertilizer / hours(1)} hours`, 3);
  }
  farmLog(
    `    (Final) Progress: ${progressDeltaTimeMs}ms, Wilt: ${wiltDeltaTimeMs}ms`,
    3
  );

  // Progress stage by minimum of water delta and water level.
  // If time is unspecified, instantly transition.
  // Store any excess progress as well
  const progressDelta = progressDeltaTimeMs / (progressTimeMs || 1);
  const progress = toNumber(plantComponent.stage_progress);
  const newProgress = progress + progressDelta;
  const excessProgress = Math.max(newProgress - 1, 0);
  plantComponent.stage_progress = clamp(newProgress, 0, 1);
  farmLog(
    `    Progress: ${progress} -> ${toNumber(plantComponent.stage_progress)}`,
    3
  );

  // Wilt by amount of water below 0 since last tick
  // Undefined/0 death time means we will not die
  if (deathTimeMs) {
    const wiltDelta = wiltDeltaTimeMs / deathTimeMs;
    const wilt = toNumber(plantComponent.wilt);
    plantComponent.wilt += wiltDelta;
    farmLog(`   Wilt: ${wilt} -> ${toNumber(plantComponent.wilt)}`, 3);
  }

  // Store time we need to water by.
  if (waterIntervalMs === undefined) {
    plantComponent.water_at = undefined;
  } else {
    const nextWaterTimeRelative = (newWaterLevel * waterIntervalMs) / timeMult;
    const nextWaterTimeMs = curTimeMs + nextWaterTimeRelative;
    // Store as seconds since epoch
    plantComponent.water_at = nextWaterTimeMs / 1000;
  }

  // Store time we are fully grown in
  const remainingStageGrowthTime =
    clamp(1 - plantComponent.stage_progress, 0, 1) * (progressTimeMs ?? 0);
  const remaningGrowthTime =
    remainingStageGrowthTime + (additionalRemainingGrowthTimeMs ?? 0);
  const adjustedGrowthTime = remaningGrowthTime / timeMult;
  const growthTimeMs = curTimeMs + adjustedGrowthTime;
  plantComponent.fully_grown_at = growthTimeMs / 1000;
  plantComponent.next_stage_at =
    (curTimeMs + remainingStageGrowthTime / timeMult) / 1000;

  // Return any excess progress after finishing the stage
  return excessProgress;
}

export function farmWorldToTensor(
  worldPos: ReadonlyVec3i,
  tensorAnchor: ReadonlyVec3i
) {
  return sub(worldPos, tensorAnchor);
}

export function farmTensorToWorld(
  tensorPos: ReadonlyVec3i,
  tensorAnchor: ReadonlyVec3i
) {
  return add(tensorPos, tensorAnchor);
}

export function farmLocalToTensor(
  localPos: ReadonlyVec3i,
  tensorRoot: ReadonlyVec3i
) {
  return add(localPos, tensorRoot);
}

export function farmTensorToLocal(
  tensorPos: ReadonlyVec3i,
  tensorRoot: ReadonlyVec3i
) {
  return sub(tensorPos, tensorRoot);
}
