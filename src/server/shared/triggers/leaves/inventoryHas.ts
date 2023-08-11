import type { TriggerContext } from "@/server/shared/triggers/core";
import { BaseStatelessTrigger } from "@/server/shared/triggers/trigger";
import type { Item } from "@/shared/ecs/gen/types";
import { inventoryCount } from "@/shared/game/inventory";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import type { BaseStoredTriggerDefinition } from "@/shared/triggers/base_schema";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import {
  zInventoryHasStoredTriggerDefinition,
  zInventoryHasTypeStoredTriggerDefinition,
} from "@/shared/triggers/schema";

export class InventoryHasTrigger extends BaseStatelessTrigger {
  public readonly kind = "inventoryHas";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly item: Item,
    public readonly count: number
  ) {
    super(spec);
  }

  static deserialize(data: any): InventoryHasTrigger {
    const spec = zInventoryHasStoredTriggerDefinition.parse(data);
    return new InventoryHasTrigger(spec, spec.item, spec.count);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "collect",
      item: this.item,
      count: this.count,
    };
  }

  tick(context: TriggerContext): boolean {
    const inventory = context.entity.inventory();
    if (!inventory) {
      return false;
    }
    return (
      Number(inventoryCount(inventory, this.item, { respectPayload: false })) >=
      this.count
    );
  }
}

export class InventoryHasTypeTrigger extends BaseStatelessTrigger {
  public readonly kind = "inventoryHas";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly typeId: BiomesId,
    public readonly count: number
  ) {
    super(spec);
  }

  static deserialize(data: any): InventoryHasTypeTrigger {
    const spec = zInventoryHasTypeStoredTriggerDefinition.parse(data);
    return new InventoryHasTypeTrigger(spec, spec.typeId, spec.count);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "inventoryHasType",
      typeId: this.typeId,
      count: this.count,
    };
  }

  tick(context: TriggerContext): boolean {
    const inventory = context.entity.inventory();
    if (!inventory) {
      return false;
    }
    return (
      Number(
        inventoryCount(inventory, anItem(this.typeId), {
          respectPayload: false,
          allowTypeMatch: true,
        })
      ) >= this.count
    );
  }
}
