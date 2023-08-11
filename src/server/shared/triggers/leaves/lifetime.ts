import type { TriggerContext } from "@/server/shared/triggers/core";
import { BaseStatelessTrigger } from "@/server/shared/triggers/trigger";
import type { Item } from "@/shared/ecs/gen/types";
import { bagCount, countTypesInBag } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import type { BaseStoredTriggerDefinition } from "@/shared/triggers/base_schema";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import {
  zEverCollectStoredTriggerDefinition,
  zEverCollectTypeStoredTriggerDefinition,
  zEverCraftStoredTriggerDefinition,
  zEverCraftTypeStoredTriggerDefinition,
} from "@/shared/triggers/schema";

export class EverCollectTrigger extends BaseStatelessTrigger {
  public readonly kind = "everCollect";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly item: Item,
    public readonly count: number
  ) {
    super(spec);
  }

  protected tick(context: TriggerContext): boolean {
    const bag = context.entity.lifetimeStats()?.stats.get("collected");
    if (!bag) {
      return false;
    }
    return (
      bagCount(bag, this.item, {
        respectPayload: false,
      }) >= this.count
    );
  }

  static deserialize(data: any): EverCollectTrigger {
    const spec = zEverCollectStoredTriggerDefinition.parse(data);
    return new EverCollectTrigger(spec, spec.item, spec.count);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "everCollect",
      item: this.item,
      count: this.count,
    };
  }
}

export class EverCollectTypeTrigger extends BaseStatelessTrigger {
  public readonly kind = "everCollectType";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly typeId: BiomesId,
    public readonly count: number
  ) {
    super(spec);
  }

  protected tick(context: TriggerContext): boolean {
    const bag = context.entity.lifetimeStats()?.stats.get("collected");
    if (!bag) {
      return false;
    }
    return countTypesInBag(bag, this.typeId) >= this.count;
  }

  static deserialize(data: any): EverCollectTypeTrigger {
    const spec = zEverCollectTypeStoredTriggerDefinition.parse(data);
    return new EverCollectTypeTrigger(spec, spec.typeId, spec.count);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "everCollectType",
      typeId: this.typeId,
      count: this.count,
    };
  }
}

export class EverCraftTrigger extends BaseStatelessTrigger {
  public readonly kind = "everCraft";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly item: Item,
    public readonly count: number
  ) {
    super(spec);
  }

  protected tick(context: TriggerContext): boolean {
    const bag = context.entity.lifetimeStats()?.stats.get("crafted");
    if (!bag) {
      return false;
    }
    return (
      bagCount(bag, this.item, {
        respectPayload: false,
      }) >= this.count
    );
  }

  static deserialize(data: any): EverCraftTrigger {
    const spec = zEverCraftStoredTriggerDefinition.parse(data);
    return new EverCraftTrigger(spec, spec.item, spec.count);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "everCraft",
      item: this.item,
      count: this.count,
    };
  }
}

export class EverCraftTypeTrigger extends BaseStatelessTrigger {
  public readonly kind = "everCraftType";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly typeId: BiomesId,
    public readonly count: number
  ) {
    super(spec);
  }

  protected tick(context: TriggerContext): boolean {
    const bag = context.entity.lifetimeStats()?.stats.get("crafted");
    if (!bag) {
      return false;
    }
    return countTypesInBag(bag, this.typeId) >= this.count;
  }

  static deserialize(data: any): EverCraftTypeTrigger {
    const spec = zEverCraftTypeStoredTriggerDefinition.parse(data);
    return new EverCraftTypeTrigger(spec, spec.typeId, spec.count);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "everCraftType",
      typeId: this.typeId,
      count: this.count,
    };
  }
}
