import type { TriggerContext } from "@/server/shared/triggers/core";
import { BaseStatelessTrigger } from "@/server/shared/triggers/trigger";
import type { BiomesId } from "@/shared/ids";
import type { BaseStoredTriggerDefinition } from "@/shared/triggers/base_schema";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { zChallengeCompleteStoredTriggerDefinition } from "@/shared/triggers/schema";

export class ChallengeCompleteTrigger extends BaseStatelessTrigger {
  public readonly kind = "challengeComplete";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly challenge: BiomesId
  ) {
    super(spec);
  }

  static deserialize(data: any): ChallengeCompleteTrigger {
    const spec = zChallengeCompleteStoredTriggerDefinition.parse(data);
    return new ChallengeCompleteTrigger(spec, spec.challenge);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "challengeComplete",
      challenge: this.challenge,
    };
  }

  tick(context: TriggerContext): boolean {
    if (context.entity?.challenges()?.complete.has(this.challenge)) {
      return true;
    }
    return context.events.some(
      (e) => e.kind === "challengeCompleted" && e.challenge === this.challenge
    );
  }
}
