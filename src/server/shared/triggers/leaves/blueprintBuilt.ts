import type { TriggerContext } from "@/server/shared/triggers/core";
import { BaseEventTrigger } from "@/server/shared/triggers/leaves/event";
import type { FirehoseEvent } from "@/shared/firehose/events";
import type { BiomesId } from "@/shared/ids";
import type { BaseStoredTriggerDefinition } from "@/shared/triggers/base_schema";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { zBlueprintBuiltStoredTriggerDefinition } from "@/shared/triggers/schema";

export class BlueprintBuiltTrigger extends BaseEventTrigger {
  public readonly kind = "blueprintBuilt";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly blueprint: BiomesId,
    count: number
  ) {
    super(spec, count);
  }

  override countForEvent(
    context: TriggerContext,
    event: FirehoseEvent
  ): number {
    if (event.kind !== "blueprintBuilt" || event.blueprint !== this.blueprint) {
      return 0;
    }
    return 1;
  }

  static deserialize(data: any): BlueprintBuiltTrigger {
    const spec = zBlueprintBuiltStoredTriggerDefinition.parse(data);
    return new BlueprintBuiltTrigger(spec, spec.blueprint, spec.count);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "blueprintBuilt",
      blueprint: this.blueprint,
      count: this.count,
    };
  }
}
