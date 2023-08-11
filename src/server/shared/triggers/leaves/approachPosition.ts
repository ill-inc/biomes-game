import type { TriggerContext } from "@/server/shared/triggers/core";
import { BaseTrigger } from "@/server/shared/triggers/trigger";
import type { Vec3f } from "@/shared/ecs/gen/types";
import { dist } from "@/shared/math/linear";
import type {
  BaseStoredTriggerDefinition,
  MetaState,
} from "@/shared/triggers/base_schema";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { zApproachPositionTriggerDefinition } from "@/shared/triggers/schema";
import type { ZodNumber } from "zod";
import { z } from "zod";

export class ApproachPositionTrigger extends BaseTrigger<ZodNumber> {
  static MAX_CLEAR_DISTANCE = 10;

  public readonly kind = "approachPosition";
  public readonly schema = z.number();

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly pos: Vec3f,
    public readonly allowDefaultNavigationAid: boolean
  ) {
    super(spec);
  }

  static deserialize(data: any): ApproachPositionTrigger {
    const spec = zApproachPositionTriggerDefinition.parse(data);
    return new ApproachPositionTrigger(
      spec,
      spec.pos,
      spec.allowDefaultNavigationAid
    );
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "approachPosition",
      pos: this.pos,
      allowDefaultNavigationAid: this.allowDefaultNavigationAid,
    };
  }

  protected tick(context: TriggerContext, state: MetaState<number>): boolean {
    if (state.payload === undefined) {
      // No payload
      state.payload = 0;
    }

    return context.events.some(
      (e) =>
        e.kind === "mapBeamRemove" &&
        dist(e.entityLocation, this.pos) <
          ApproachPositionTrigger.MAX_CLEAR_DISTANCE
    );
  }
}
