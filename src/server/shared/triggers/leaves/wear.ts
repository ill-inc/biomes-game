import type { TriggerContext } from "@/server/shared/triggers/core";
import { BaseEventTrigger } from "@/server/shared/triggers/leaves/event";
import type { Item } from "@/shared/ecs/gen/types";
import type { FirehoseEvent } from "@/shared/firehose/events";
import { bagContains, countTypesInBag } from "@/shared/game/items";
import { stringToItemBag } from "@/shared/game/items_serde";
import type { BiomesId } from "@/shared/ids";
import type { BaseStoredTriggerDefinition } from "@/shared/triggers/base_schema";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import {
  zWearStoredTriggerDefinition,
  zWearTypeStoredTriggerDefinition,
} from "@/shared/triggers/schema";

export class WearTrigger extends BaseEventTrigger {
  public readonly kind = "wear";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly item: Item,
    count: number
  ) {
    super(spec, count);
  }

  override countForEvent(
    _context: TriggerContext,
    event: FirehoseEvent
  ): number {
    return event.kind === "wearing" &&
      bagContains(stringToItemBag(event.bag), this.item)
      ? 1
      : 0;
  }

  static deserialize(data: any): WearTrigger {
    const spec = zWearStoredTriggerDefinition.parse(data);
    return new WearTrigger(spec, spec.item, spec.count);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "wear",
      item: this.item,
      count: this.count,
    };
  }
}

export class WearTypeTrigger extends BaseEventTrigger {
  public readonly kind = "wearType";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly typeId: BiomesId,
    count: number
  ) {
    super(spec, count);
  }

  override countForEvent(
    _context: TriggerContext,
    event: FirehoseEvent
  ): number {
    return event.kind === "wearing" &&
      countTypesInBag(stringToItemBag(event.bag), this.typeId) > 0
      ? 1
      : 0;
  }

  static deserialize(data: any): WearTypeTrigger {
    const spec = zWearTypeStoredTriggerDefinition.parse(data);
    return new WearTypeTrigger(spec, spec.typeId, spec.count);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "wearType",
      typeId: this.typeId,
      count: this.count,
    };
  }
}
