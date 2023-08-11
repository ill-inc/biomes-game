import type { TriggerContext } from "@/server/shared/triggers/core";
import { BaseTrigger } from "@/server/shared/triggers/trigger";
import type { Vec2f } from "@/shared/ecs/gen/types";
import { dist2 } from "@/shared/math/linear";
import type {
  BaseStoredTriggerDefinition,
  MetaState,
} from "@/shared/triggers/base_schema";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { zMapBeamStoredTriggerDefinition } from "@/shared/triggers/schema";
import type { ZodNumber } from "zod";
import { z } from "zod";

export class MapBeamTrigger extends BaseTrigger<ZodNumber> {
  static MAX_CLEAR_DISTANCE = 10;

  public readonly kind = "mapBeam";
  public readonly schema = z.number();

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly pos: Vec2f,
    public readonly allowDefaultNavigationAid: boolean
  ) {
    super(spec);
  }

  static deserialize(data: any): MapBeamTrigger {
    const spec = zMapBeamStoredTriggerDefinition.parse(data);
    return new MapBeamTrigger(spec, spec.pos, spec.allowDefaultNavigationAid);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "mapBeam",
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
        dist2([e.entityLocation[0], e.entityLocation[2]], this.pos) <
          MapBeamTrigger.MAX_CLEAR_DISTANCE
    );
  }
}
