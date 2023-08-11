import type { TriggerContext } from "@/server/shared/triggers/core";
import { BaseEventTrigger } from "@/server/shared/triggers/leaves/event";
import type { Item } from "@/shared/ecs/gen/types";
import type { FirehoseEvent } from "@/shared/firehose/events";
import { bagCount, countTypesInBag } from "@/shared/game/items";
import { stringToItemBag } from "@/shared/game/items_serde";
import type { BiomesId } from "@/shared/ids";
import type { BaseStoredTriggerDefinition } from "@/shared/triggers/base_schema";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import {
  zCollectStoredTriggerDefinition,
  zCollectTypeStoredTriggerDefinition,
} from "@/shared/triggers/schema";

export class CollectTrigger extends BaseEventTrigger {
  public readonly kind = "collect";

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
    return event.kind === "collect"
      ? Number(
          bagCount(stringToItemBag(event.bag), this.item, {
            respectPayload: false,
          })
        )
      : 0;
  }

  static deserialize(data: any): CollectTrigger {
    const spec = zCollectStoredTriggerDefinition.parse(data);
    return new CollectTrigger(spec, spec.item, spec.count);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "collect",
      item: this.item,
      count: this.count,
    };
  }
}

export class CollectTypeTrigger extends BaseEventTrigger {
  public readonly kind = "collectType";

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
    return event.kind === "collect"
      ? countTypesInBag(stringToItemBag(event.bag), this.typeId)
      : 0;
  }

  static deserialize(data: any): CollectTypeTrigger {
    const spec = zCollectTypeStoredTriggerDefinition.parse(data);
    return new CollectTypeTrigger(spec, spec.typeId, spec.count);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "collectType",
      typeId: this.typeId,
      count: this.count,
    };
  }
}
