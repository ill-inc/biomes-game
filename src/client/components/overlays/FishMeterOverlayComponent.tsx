import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { InventoryCellContents } from "@/client/components/inventory/InventoryCellContents";
import { ShortcutText } from "@/client/components/system/ShortcutText";
import { MarchHelper } from "@/client/game/helpers/march";
import type { FishMeterOverlay } from "@/client/game/resources/overlays";
import type { ClientReactResources } from "@/client/game/resources/types";
import { allBait, allFishingRods } from "@/client/game/util/fishing/helpers";
import {
  fishingContext,
  genFishingContextDropTable,
} from "@/client/game/util/fishing/params";
import { anItem } from "@/shared/game/item";
import type { LootProbability } from "@/shared/game/item_specs";
import { countOf, numberToLootProbability } from "@/shared/game/items";
import { blockPos, voxelShard } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import type { Vec3 } from "@/shared/math/types";
import { DefaultMap } from "@/shared/util/collections";
import type { VoxelooModule } from "@/shared/wasm/types";
import { sortBy } from "lodash";
import React from "react";

function cursorWater(
  { voxeloo }: { voxeloo: VoxelooModule },
  resources: ClientReactResources
) {
  const { hit } = resources.use("/scene/cursor");
  const hitDistance = hit?.distance ?? 32;
  const ray = MarchHelper.getPlayerRay(resources, 32);
  const pos = ray.source.toArray();
  const dir = ray.direction.toArray();

  let waterPos: Vec3 | undefined;
  voxeloo.march_faces(pos, dir, (x, y, z, d) => {
    if (d > hitDistance + 0.1) {
      return false;
    }
    const id = voxelShard(x, y, z);
    const tensor = resources.get("/water/tensor", id);
    if (tensor.get(...blockPos(x, y, z)) > 0) {
      waterPos = [x, y, z];
      return false;
    }
    return true;
  });
  return waterPos;
}

export const FishMeterOverlayComponent: React.FunctionComponent<{
  overlay: FishMeterOverlay;
}> = ({ overlay: _overlay }) => {
  const clientContext = useClientContext();
  const { reactResources } = clientContext;
  const pos = cursorWater(clientContext, reactResources);
  const [baitIndex, setBaitIndex] = React.useState<number | undefined>();
  const [rodIndex, setRodIndex] = React.useState(0);

  if (!pos) {
    return <div className="inspect-overlay">(No water here)</div>;
  }

  const rod = allFishingRods()[rodIndex];
  const bait =
    !rod.acceptsBait || baitIndex === undefined
      ? undefined
      : allBait()[baitIndex];

  const ctx = fishingContext(clientContext, pos, rod, bait);
  const samples = genFishingContextDropTable(ctx);
  const sampleProbabilityTotal = samples.reduce(
    (acc, sample) => acc + sample.probability,
    0
  );
  // Group samples together, and combine probabilities
  // We can have multiple entries for one fish when we match multiple conditions.
  const groupedSamples = new DefaultMap<BiomesId, LootProbability[]>(() => []);
  const combinedSamples: DefaultMap<BiomesId, number> = new DefaultMap<
    BiomesId,
    number
  >(() => 0);
  for (const sample of samples) {
    // Show each individual probability
    groupedSamples
      .get(sample.value)
      .push(numberToLootProbability(sample.probability) ?? sample.probability);
    // But combine the actual number for the % calculation.
    combinedSamples.set(
      sample.value,
      combinedSamples.get(sample.value) + sample.probability
    );
  }

  // Sort by most likely to least likely
  const sortedSamples = sortBy(
    Array.from(combinedSamples.entries()),
    ([, probability]) => -probability
  );
  return (
    <div className="inspect-overlay">
      <div className="flex">
        <ShortcutText
          shortcut="G"
          keyCode="KeyG"
          onKeyDown={() =>
            setRodIndex((v) => (v + 1) % allFishingRods().length)
          }
          onShiftedKeyDown={() =>
            setRodIndex(
              (v) => (v + allFishingRods().length - 1) % allFishingRods().length
            )
          }
        />
        <div className="flex flex-col">
          <div className="cell mid h-4 w-4">
            <InventoryCellContents slot={countOf(rod.id)} />
          </div>
          <label>{rod.displayName}</label>
        </div>
        {rod.acceptsBait && (
          <>
            <ShortcutText
              shortcut="F"
              keyCode="KeyF"
              onKeyDown={() =>
                setBaitIndex((v) => {
                  if (v === undefined) {
                    return 0;
                  }
                  const newIndex = (v + 1) % allBait().length;
                  if (newIndex === 0) {
                    return undefined;
                  }
                  return newIndex;
                })
              }
              onShiftedKeyDown={() =>
                setBaitIndex((v) => {
                  if (v === undefined) {
                    return allBait().length - 1;
                  }
                  const newIndex =
                    (v - 1 + allBait().length) % allBait().length;
                  if (newIndex === 0) {
                    return undefined;
                  }
                  return newIndex;
                })
              }
            />
            <div className="flex flex-col">
              <div className="cell mid h-4 w-4">
                <InventoryCellContents slot={bait && countOf(bait.id)} />
              </div>
              <label>{bait?.displayName ?? "(No Bait)"}</label>
            </div>
          </>
        )}
      </div>
      <div className="grid grid-cols-2">
        <div className="grid grid-cols-3">
          {sortedSamples.map((sample, i) => (
            <React.Fragment key={i}>
              <div>{anItem(sample[0]).displayName}</div>
              <div>{groupedSamples.get(sample[0]).join("+")}</div>
              <div>
                {(
                  Math.min(sample[1] / sampleProbabilityTotal, sample[1]) * 100
                ).toFixed(2)}
                %
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="whitespace-pre text-xs opacity-50">
          {JSON.stringify(ctx, undefined, 2)}
        </div>
      </div>
    </div>
  );
};
