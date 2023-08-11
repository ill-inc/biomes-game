import type { Vec3i } from "@/shared/ecs/gen/types";
import { log } from "@/shared/logging";
import type { ProbabilityTable } from "@/shared/loot_tables/probability_table";
import { rollProbabilityTable } from "@/shared/loot_tables/probability_table";
import type { Tensor } from "@/shared/wasm/tensors";
import { ok } from "assert";
import type {
  BaseFarmingPlantTicker,
  FarmingPlantTickContext,
} from "@/server/gaia_v2/simulations/farming/plant_ticker";
import type {
  VariantFarmingTickerSpec,
  TickerFactory,
} from "@/server/gaia_v2/simulations/farming/plant_ticker_spec";
import { farmLog } from "@/server/gaia_v2/simulations/farming/util";

export class FarmingVariantPlantTicker implements BaseFarmingPlantTicker {
  private variantTickers: Map<number, BaseFarmingPlantTicker> = new Map();
  constructor(
    public readonly spec: VariantFarmingTickerSpec,
    private readonly factory: TickerFactory
  ) {}

  private rollVariant(): number {
    const probabilityTable: ProbabilityTable<number> = this.spec.variants.map(
      (v, i) => ({ value: i, probability: v.chance })
    );
    const roll = rollProbabilityTable(probabilityTable) ?? 0;
    farmLog(`    Rolled variant: ${roll}`, 2);
    return roll;
  }

  getVariantSpec(idx: number) {
    if (idx < 0 || idx >= this.spec.variants.length) {
      // Spec may have changed since we rolled the variant. Default to 0
      idx = 0;
    }
    const variantSpec = this.spec.variants[idx].def;
    // If we have any top-level definitions, use those instead
    if (this.spec.waterIntervalMs !== undefined) {
      variantSpec.waterIntervalMs = this.spec.waterIntervalMs;
    }
    if (this.spec.deathTimeMs !== undefined) {
      variantSpec.deathTimeMs = this.spec.deathTimeMs;
    }
    return variantSpec;
  }

  getVariantTickerByIndex(idx: number) {
    let ticker = this.variantTickers.get(idx);
    if (ticker === undefined) {
      ticker = this.factory(this.getVariantSpec(idx));
      if (!ticker) {
        log.error(
          "Failed to create ticker for variant",
          this.getVariantSpec(idx)
        );
      } else {
        this.variantTickers.set(idx, ticker);
      }
    }
    return ticker;
  }

  ensureVariant(context: FarmingPlantTickContext) {
    // If no variant, roll one.
    const plantComponent = context.plant.entity.mutableFarmingPlantComponent();
    if (!plantComponent) {
      log.error(`No farming plant component on entity ${context.plant.id}`);
      return;
    }
    if (plantComponent.variant === undefined) {
      plantComponent.variant = this.rollVariant();
    }
  }

  getVariantTicker(context: FarmingPlantTickContext): BaseFarmingPlantTicker {
    this.ensureVariant(context);
    const ticker = this.getVariantTickerByIndex(
      context.plant.entity.mutableFarmingPlantComponent().variant ?? 0
    );
    ok(ticker);
    return ticker;
  }

  tick(context: FarmingPlantTickContext, deltaSeconds: number) {
    return this.getVariantTicker(context).tick(context, deltaSeconds);
  }

  expectedBlocks(context: FarmingPlantTickContext): Tensor<"U32"> {
    return this.getVariantTicker(context).expectedBlocks(context);
  }

  tensorAnchor(context: FarmingPlantTickContext): Vec3i {
    return this.getVariantTicker(context).tensorAnchor(context);
  }

  tensorShape(context: FarmingPlantTickContext): Vec3i {
    return this.getVariantTicker(context).tensorShape(context);
  }
}
