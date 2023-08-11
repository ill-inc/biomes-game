import type { ShapeName } from "@/shared/asset_defs/shapes";
import { getIsomorphism } from "@/shared/asset_defs/shapes";
import { getTerrainID, isTerrainName } from "@/shared/asset_defs/terrain";
import { BikkieRuntime, getBiscuit } from "@/shared/bikkie/active";
import type {
  BasicFarmSpec,
  FarmSpec,
  TreeFarmSpec,
  VariantFarmSpec,
} from "@/shared/game/farming";
import { seconds } from "@/shared/game/farming";
import type { DropTable } from "@/shared/game/item_specs";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import type { Vec4 } from "@/shared/math/types";
import { compactMap } from "@/shared/util/collections";
import { assertNever } from "@/shared/util/type_helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import type { GaiaReplica } from "@/server/gaia_v2/table";
import {
  withTilledSoil,
  withDirt,
} from "@/server/gaia_v2/simulations/farming/growth_helpers";
import type { GrowthStage } from "@/server/gaia_v2/simulations/farming/growth_specs";
import {
  plantGrowthStageSimple,
  plantGrowthStageLog,
  plantGrowthStageFromGroupBlob,
  plantGrowthStageFromGroup,
} from "@/server/gaia_v2/simulations/farming/growth_specs";
import { FarmingGrowthPlantTicker } from "@/server/gaia_v2/simulations/farming/plant_growth_ticker";
import type { BaseFarmingPlantTicker } from "@/server/gaia_v2/simulations/farming/plant_ticker";
import { FarmingVariantPlantTicker } from "@/server/gaia_v2/simulations/farming/plant_variant_ticker";

export function createTickerForFarmSpec(
  voxeloo: VoxelooModule,
  spec: FarmSpec | undefined,
  table: GaiaReplica["table"]
) {
  if (!spec) {
    return;
  }
  const tickerSpec = tickerSpecForFarmSpec(voxeloo, spec, table);
  if (tickerSpec === undefined) {
    return;
  }
  return createTickerForTickerSpec(voxeloo, tickerSpec);
}

export type TickerFactory = (spec: FarmingTickerSpec) => BaseFarmingPlantTicker;

function createTickerForTickerSpec(
  voxeloo: VoxelooModule,
  spec: FarmingTickerSpec
): BaseFarmingPlantTicker {
  switch (spec.kind) {
    case "variant":
      return new FarmingVariantPlantTicker(spec, (spec) =>
        createTickerForTickerSpec(voxeloo, spec)
      );
    case "growth":
      return new FarmingGrowthPlantTicker(voxeloo, spec);
    default:
      assertNever(spec);
  }
}

export type GrowthFarmingStage = {
  growthStage: GrowthStage;
  name?: string;
  timeMs?: number;
  canWilt?: boolean;
  requiresWater?: boolean;
  requiresSun?: boolean;
  rollSeed?: boolean;
  acquireRewards?: boolean;
  dropTable?: DropTable;
  irradiance?: Vec4;
};

export type GrowthFarmingTickerSpec = {
  kind: "growth";
  name: string;
  stages: GrowthFarmingStage[];
  deathTimeMs?: number;
  waterIntervalMs?: number;
  partialGrowthDropTable?: DropTable;
  seedDropTable?: DropTable;
};

export type VariantFarmingTickerSpec = {
  kind: "variant";
  variants: { def: FarmingTickerSpec; chance: number }[];
  deathTimeMs?: number;
  waterIntervalMs?: number;
};

export type FarmingTickerSpec =
  | GrowthFarmingTickerSpec
  | VariantFarmingTickerSpec;

export type GrowthParameters = {
  timeMs: number;
  waterIntervalMs?: number;
  deathTimeMs?: number;
};

export function tickerSpecForFarmSpec(
  voxeloo: VoxelooModule,
  spec: FarmSpec,
  table: GaiaReplica["table"]
): FarmingTickerSpec | undefined {
  switch (spec.kind) {
    case "basic":
      return tickerSpecForBasicPlant(voxeloo, spec);
    case "variant":
      return tickerSpecForVariantPlant(voxeloo, spec, table);
    case "tree":
      return tickerSpecForTreePlant(voxeloo, spec, table);
    default:
      assertNever(spec);
  }
}

function tickerSpecForBasicPlant(
  voxeloo: VoxelooModule,
  spec: BasicFarmSpec
): GrowthFarmingTickerSpec {
  const bikkie = BikkieRuntime.get();
  const terrainName = bikkie.getBiscuit(spec.block)?.terrainName;
  const blockId = isTerrainName(terrainName)
    ? getTerrainID(terrainName)
    : getTerrainID("dirt");
  const growingBlockId = spec.hasGrowthStages
    ? blockId
    : getTerrainID("sapling");
  const plantName =
    spec.name || bikkie.getBiscuit(spec.block)?.displayName || "Plant";
  const flags = {
    writeGrowthProgress: spec.hasGrowthStages,
    removeWhenDestroyed: true,
  };
  const tickerSpec: GrowthFarmingTickerSpec = {
    kind: "growth",
    name: plantName,
    stages: [
      {
        growthStage: withTilledSoil(
          voxeloo,
          plantGrowthStageSimple(voxeloo, growingBlockId, undefined, {
            ...flags,
            required: true,
            dropBlock: false,
            startProgress: 0,
            endProgress: 0,
          })
        ),
        timeMs: seconds(0),
        canWilt: true,
        requiresWater: true,
        requiresSun: spec.requiresSun,
      },
      {
        growthStage: withTilledSoil(
          voxeloo,
          plantGrowthStageSimple(voxeloo, growingBlockId, undefined, {
            ...flags,
            required: true,
            dropBlock: false,
            startProgress: 0,
            endProgress: 0.5,
          })
        ),
        timeMs: spec.timeMs / 2,
        canWilt: true,
        requiresWater: true,
        requiresSun: spec.requiresSun,
      },
      {
        growthStage: withTilledSoil(
          voxeloo,
          plantGrowthStageSimple(voxeloo, growingBlockId, undefined, {
            ...flags,
            required: true,
            dropBlock: false,
            startProgress: 0.5,
            endProgress: 1,
          })
        ),
        timeMs: spec.timeMs / 2,
        canWilt: true,
        rollSeed: true,
        requiresWater: true,
        requiresSun: spec.requiresSun,
      },
      {
        growthStage: withDirt(
          voxeloo,
          plantGrowthStageSimple(voxeloo, blockId, undefined, {
            ...flags,
            required: true,
            dropBlock: false,
            startProgress: 1,
            endProgress: 1,
          })
        ),
        dropTable: spec.dropTable,
        timeMs: seconds(0),
        canWilt: true,
        requiresWater: false,
        acquireRewards: true,
      },
    ],
    waterIntervalMs: spec.waterIntervalMs,
    deathTimeMs: spec.deathTimeMs,
    partialGrowthDropTable: spec.partialGrowthDropTable,
    seedDropTable: spec.seedDropTable,
  };

  // Apply irradiance, linearly interpolating intensity over time
  if (spec.irradiance) {
    let runningTime = 0;
    const totalTime = tickerSpec.stages
      .map((stage) => stage.timeMs || 0)
      .reduce((a, b) => a + b, 0);
    tickerSpec.stages = tickerSpec.stages.map((stage) => {
      runningTime += stage.timeMs || 0;
      const intensity = (runningTime / totalTime) * spec.irradiance![3];
      const irradiance = [...spec.irradiance!.slice(0, 3), intensity] as Vec4;
      return {
        ...stage,
        irradiance,
      };
    });
  }

  return tickerSpec;
}

function tickerSpecForTreePlant(
  voxeloo: VoxelooModule,
  spec: TreeFarmSpec,
  table: GaiaReplica["table"]
): GrowthFarmingTickerSpec {
  const leafTerrainName = getBiscuit(spec.leafBlock)?.terrainName;
  const logTerrainName = getBiscuit(spec.logBlock)?.terrainName;
  const leafId = isTerrainName(leafTerrainName)
    ? getTerrainID(leafTerrainName)
    : getTerrainID("oak_leaf");
  const logId = isTerrainName(logTerrainName)
    ? getTerrainID(logTerrainName)
    : getTerrainID("oak_log");
  const noGrowthFlags = {
    writeGrowthProgress: false,
  };
  const treeName =
    spec.name ||
    getBiscuit(spec.logBlock)?.displayName.replace(/ Log$i/i, "") ||
    "Tree";
  const stages: GrowthFarmingStage[] = [];
  for (const stageSpec of spec.stages) {
    let growthStage: GrowthStage | undefined;
    switch (stageSpec.kind) {
      case "sapling":
        growthStage = withTilledSoil(
          voxeloo,
          plantGrowthStageSimple(voxeloo, getTerrainID("sapling"), undefined, {
            ...noGrowthFlags,
            required: true,
            dropBlock: false,
          })
        );
        break;
      case "log":
        growthStage = withTilledSoil(
          voxeloo,
          plantGrowthStageLog(
            voxeloo,
            logId,
            leafId,
            stageSpec.logs,
            getIsomorphism(
              stageSpec.logShape as ShapeName,
              [0, 0, 0],
              [0, 1, 2]
            ),
            noGrowthFlags
          )
        );
        break;
      case "group":
        growthStage = withDirt(
          voxeloo,
          stageSpec.groupBlob
            ? plantGrowthStageFromGroupBlob(
                voxeloo,
                stageSpec.groupBlob,
                undefined,
                noGrowthFlags
              )
            : plantGrowthStageFromGroup(
                voxeloo,
                table,
                stageSpec.groupId ?? INVALID_BIOMES_ID,
                undefined,
                noGrowthFlags
              )
        );
        break;
    }
    let name = stageSpec.name;
    if (!name) {
      // Determine a name from the tree name, if none specified
      switch (stageSpec.kind) {
        case "sapling":
          name = treeName + " Sprout";
          break;
        case "log":
          name = treeName + " Sapling";
          break;
        default:
          name = treeName;
          break;
      }
    }

    stages.push({
      growthStage,
      name,
      timeMs: stageSpec.timeMs,
      requiresWater: stageSpec.requiresWater,
      requiresSun: stageSpec.requiresSun,
      canWilt: false,
    });
  }
  // Add spec loot to last stage.
  const lastStage = stages[stages.length - 1];
  if (lastStage && spec.dropTable) {
    if (lastStage.dropTable === undefined) {
      lastStage.dropTable = [];
    }
    lastStage.dropTable.push(...spec.dropTable);
  }
  return {
    kind: "growth",
    name: treeName,
    stages,
    waterIntervalMs: spec.waterIntervalMs,
    deathTimeMs: spec.deathTimeMs,
    partialGrowthDropTable: spec.partialGrowthDropTable,
    seedDropTable: spec.seedDropTable,
  };
}

function tickerSpecForVariantPlant(
  voxeloo: VoxelooModule,
  spec: VariantFarmSpec,
  table: GaiaReplica["table"]
): VariantFarmingTickerSpec {
  return {
    kind: "variant",
    variants: compactMap(spec.variants, (v) => {
      const def = tickerSpecForFarmSpec(voxeloo, v.def, table);
      if (!def) {
        return;
      }
      return {
        def,
        chance: v.chance,
      };
    }),
  };
}
