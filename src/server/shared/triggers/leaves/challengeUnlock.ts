import type { TriggerContext } from "@/server/shared/triggers/core";
import { BaseStatelessTrigger } from "@/server/shared/triggers/trigger";
import type { BiomesId } from "@/shared/ids";
import type { BaseStoredTriggerDefinition } from "@/shared/triggers/base_schema";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { zChallengeUnlockedStoredTriggerDefinition } from "@/shared/triggers/schema";

export class ChallengeUnlockedTrigger extends BaseStatelessTrigger {
  public readonly kind = "challengeUnlocked";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly challenge: BiomesId
  ) {
    super(spec);
  }

  static deserialize(data: any): ChallengeUnlockedTrigger {
    const spec = zChallengeUnlockedStoredTriggerDefinition.parse(data);
    return new ChallengeUnlockedTrigger(spec, spec.challenge);
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: "challengeUnlocked",
      challenge: this.challenge,
    };
  }

  tick(context: TriggerContext): boolean {
    if (context.entity?.challenges()?.in_progress.has(this.challenge)) {
      return true;
    }
    return context.events.some(
      (e) => e.kind === "challengeUnlocked" && e.challenge === this.challenge
    );
  }
}
