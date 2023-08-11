import { getOwnedItems } from "@/client/components/inventory/helpers";
import type { ClientContextSubset } from "@/client/game/context";
import { bikkieDerived, getBiscuit, getBiscuits } from "@/shared/bikkie/active";
import { BikkieIds } from "@/shared/bikkie/ids";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type { FishLengthDistribution } from "@/shared/bikkie/schema/types";
import type {
  Item,
  ItemBag,
  OwnedItemReference,
  Vec3f,
} from "@/shared/ecs/gen/types";
import { maybeGetSlotByRef } from "@/shared/game/inventory";
import {
  countOf,
  createBag,
  lootProbabilityToNumber,
} from "@/shared/game/items";
import { timeOfDay } from "@/shared/game/sun_moon_position";
import { TerrainHelper } from "@/shared/game/terrain_helper";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import type { GameStatePredicatedValues } from "@/shared/loot_tables/builder";
import { constructGameStatePredicated } from "@/shared/loot_tables/builder";
import type { GameStateContext } from "@/shared/loot_tables/indexing";
import type { ProbabilityTableEntry } from "@/shared/loot_tables/probability_table";
import {
  rollProbabilityTable,
  withFallbackProbabilityTable,
} from "@/shared/loot_tables/probability_table";
import type { TruncatedGaussianDistribution } from "@/shared/math/gaussian";
import { sampleTruncatedGaussianDistribution } from "@/shared/math/gaussian";
import { add, sub } from "@/shared/math/linear";
import { flatMap } from "lodash";

export type FishingInfoCatchType = "treasure" | "normal" | "dunce" | "empty";

const MAX_WATER_DEPTH = 32;

// Time (in seconds) you must wait to retry after a failed attempt.
export const DEFAULT_RETRY_DELAY = 0.2;
export const MISSED_BITE_RETRY_DELAY = 3.0;

export const fishingTable = bikkieDerived("fishingTable", () => {
  const items = getBiscuits("/items");
  const fishEntries: GameStatePredicatedValues<
    ProbabilityTableEntry<BiomesId>
  >[] = flatMap(items, (item) => {
    if (!item.fishConditions) {
      return [];
    }
    return item.fishConditions.map((cond) => ({
      value: {
        value: item.id,
        probability: lootProbabilityToNumber(cond.probability),
      },
      predicates: cond.predicates,
    }));
  });
  const fishingTable = constructGameStatePredicated(fishEntries);
  return fishingTable;
});

export function truncatedGaussianForFishDistribution(
  fishLengthDistribution: FishLengthDistribution
): TruncatedGaussianDistribution {
  const { mean, variance: varianceSpec, min } = fishLengthDistribution;
  const variance = varianceSpec
    ? varianceSpec
    : Math.max((mean - min) / 2.0, 0.0);
  return {
    mean,
    variance,
    lowerBound: min,
  };
}

export function marchWaterDepth(
  terrainHelper: TerrainHelper,
  surfacePos: Vec3f
) {
  for (let i = 0; i < MAX_WATER_DEPTH; i++) {
    const pos = sub(surfacePos, [0, i, 0]);
    if (!terrainHelper.getWater(pos)) {
      return i;
    }
  }
  return MAX_WATER_DEPTH;
}

const FISHING_ROOF_HEIGHT = 32;
export function marchFishingRoof(
  terrainHelper: TerrainHelper,
  surfacePos: Vec3f
) {
  for (let i = 0; i < FISHING_ROOF_HEIGHT; i++) {
    const pos = add(surfacePos, [0, i, 0]);
    if (terrainHelper.isBlockID(pos)) {
      return true;
    }
  }
  return false;
}

// Roll one of these fish if we don't get a fish normally
const fallbackDropTable = constructGameStatePredicated([
  {
    value: {
      value: BikkieIds.clownfish,
      probability: 1,
    },
    predicates: [{ kind: "notMuck" }],
  },
  {
    value: {
      value: BikkieIds.koi,
      probability: 1,
    },

    predicates: [{ kind: "notMuck" }],
  },
  {
    value: {
      value: BikkieIds.punkfish,
      probability: 1,
    },
    predicates: [{ kind: "inMuck" }],
  },
  {
    value: {
      value: BikkieIds.spikefish,
      probability: 1,
    },
    predicates: [{ kind: "inMuck" }],
  },
  { value: { value: BikkieIds.switchGrass, probability: 1 }, predicates: [] },
]);

export function genFishingContextDropTable(context: GameStateContext) {
  const table = withFallbackProbabilityTable(
    fishingTable(),
    fallbackDropTable,
    context
  );
  return table;
}

export function fishingContext(
  deps: ClientContextSubset<"resources" | "voxeloo">,
  surfacePosition: Vec3f,
  rod?: Item,
  bait?: Item
): GameStateContext {
  const clock = deps.resources.get("/clock");
  const terrainHelper = TerrainHelper.fromResources(
    deps.voxeloo,
    deps.resources
  );
  const waterDepth = marchWaterDepth(terrainHelper, surfacePosition);
  const skyOcclusion = terrainHelper.getSkyOcclusion(surfacePosition);
  const muck = terrainHelper.getMuck(surfacePosition);
  return {
    muck,
    toolHardnessClass: rod?.hardnessClass,
    timeOfDay: timeOfDay(clock.time),
    positionX: surfacePosition[0],
    positionY: surfacePosition[1],
    positionZ: surfacePosition[2],
    bait: bait?.id ?? INVALID_BIOMES_ID,
    waterDepth,
    skyOcclusion,
  };
}

export function genDrop(
  deps: ClientContextSubset<"userId" | "resources" | "voxeloo">,
  surfacePosition: Vec3f,
  rodItemRef: OwnedItemReference | undefined,
  baitItemRef: OwnedItemReference | undefined
): [FishingInfoCatchType, ItemBag] {
  const ownedItems = getOwnedItems(deps.resources, deps.userId);
  const rod = maybeGetSlotByRef(ownedItems, rodItemRef);
  const bait = maybeGetSlotByRef(ownedItems, baitItemRef);
  const rollContext = fishingContext(
    deps,
    surfacePosition,
    rod?.item,
    bait?.item
  );
  const id = rollProbabilityTable(genFishingContextDropTable(rollContext));

  if (!id) {
    return ["empty", createBag()];
  }

  // Use bikkie for distribution, if defined.
  const biscuit = getBiscuit(id);
  const catchType = biscuit.treasureChestDrop ? "treasure" : "normal";
  if (biscuit.fishLengthDistribution) {
    return [
      catchType,
      createBag(
        countOf(id, {
          [attribs.fishLength.id]: sampleTruncatedGaussianDistribution(
            truncatedGaussianForFishDistribution(biscuit.fishLengthDistribution)
          ),
        })
      ),
    ];
  }

  // Default: just drop one
  return [catchType, createBag(countOf(id))];
}

export function genDunceDrop(): ItemBag {
  return createBag(countOf(BikkieIds.switchGrass));
}
