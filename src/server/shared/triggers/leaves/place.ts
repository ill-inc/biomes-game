import type { TriggerContext } from "@/server/shared/triggers/core";
import { BaseEventTrigger } from "@/server/shared/triggers/leaves/event";
import type { Item } from "@/shared/ecs/gen/types";
import type { FirehoseEvent } from "@/shared/firehose/events";
import { anItem } from "@/shared/game/item";
import type { BaseStoredTriggerDefinition } from "@/shared/triggers/base_schema";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { zPlaceStoredTriggerDefinition } from "@/shared/triggers/schema";

export class PlaceTrigger extends BaseEventTrigger {
  public readonly kind = "place";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly item: Item,
    count: number
  ) {
    super(spec, count);
  }

  override countForEvent(
    context: TriggerContext,
    event: FirehoseEvent
  ): number {
    if (event.kind !== "place" || event.item.id !== this.item.id) {
      return 0;
    }
    return 1;
  }

  static deserialize(data: any): PlaceTrigger {
    const spec = zPlaceStoredTriggerDefinition.parse(data);
    return new PlaceTrigger(spec, anItem(spec.item), spec.count);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "place",
      item: this.item,
      count: this.count,
    };
  }
}
