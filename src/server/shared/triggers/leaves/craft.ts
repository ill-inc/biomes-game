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
  zCraftStoredTriggerDefinition,
  zCraftTypeStoredTriggerDefinition,
} from "@/shared/triggers/schema";

export function stationMatches(
  actual: BiomesId | undefined,
  expected: BiomesId | undefined
) {
  if (expected === undefined) {
    return true;
  }
  return actual === expected;
}

export class CraftTrigger extends BaseEventTrigger {
  public readonly kind = "craft";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly item: Item,
    count: number,
    public readonly station: BiomesId | undefined
  ) {
    super(spec, count);
  }

  override countForEvent(
    _context: TriggerContext,
    event: FirehoseEvent
  ): number {
    if (
      event.kind !== "craft" ||
      !stationMatches(event.station, this.station)
    ) {
      return 0;
    }
    return Number(
      bagCount(stringToItemBag(event.bag), this.item, {
        respectPayload: false,
      })
    );
  }

  static deserialize(data: any): CraftTrigger {
    const spec = zCraftStoredTriggerDefinition.parse(data);
    return new CraftTrigger(spec, spec.item, spec.count, spec.station);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "craft",
      item: this.item,
      count: this.count,
      station: this.station,
    };
  }
}

export class CraftTypeTrigger extends BaseEventTrigger {
  public readonly kind = "craftType";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly typeId: BiomesId,
    count: number,
    public readonly station: BiomesId | undefined
  ) {
    super(spec, count);
  }

  override countForEvent(
    _context: TriggerContext,
    event: FirehoseEvent
  ): number {
    if (
      event.kind !== "craft" ||
      !stationMatches(event.station, this.station)
    ) {
      return 0;
    }
    return countTypesInBag(stringToItemBag(event.bag), this.typeId);
  }

  static deserialize(data: any): CraftTypeTrigger {
    const spec = zCraftTypeStoredTriggerDefinition.parse(data);
    return new CraftTypeTrigger(spec, spec.typeId, spec.count, spec.station);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "craftType",
      typeId: this.typeId,
      count: this.count,
      station: this.station,
    };
  }
}
