import type { Trigger, TriggerContext } from "@/server/shared/triggers/core";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type {
  BaseStoredTriggerDefinition,
  MetaState,
} from "@/shared/triggers/base_schema";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import type { ZodTypeAny, ZodVoid } from "zod";
import { z } from "zod";

export abstract class BaseTrigger<T extends ZodTypeAny> implements Trigger {
  abstract kind: string;
  abstract schema: T;
  public readonly leaf: boolean = true;

  constructor(public readonly spec: BaseStoredTriggerDefinition) {}

  isEmpty(): boolean {
    return false;
  }

  update(context: TriggerContext): boolean {
    return (
      context.updateState(this.spec.id, this.schema, (state) => {
        if (state.firedAt !== undefined) {
          return state;
        }
        // Admin manual step progression
        // Magical event will progress any leaf trigger
        if (
          this.leaf &&
          context.events.find(
            (e) =>
              e.kind === "adminProgressQuestStep" &&
              e.questId === context.rootId
          )
        ) {
          return { firedAt: secondsSinceEpoch() };
        }
        if (this.tick(context, state)) {
          const successfullyTakenItems = this.maybeTakeItems(context);
          if (successfullyTakenItems) {
            this.maybeGiveRewards(context);
            return { firedAt: secondsSinceEpoch() };
          }
        }
        return { payload: state.payload };
      }).firedAt !== undefined
    );
  }

  protected maybeGiveRewards(_: TriggerContext) {
    // None.
  }

  protected maybeTakeItems(_: TriggerContext): boolean {
    return true;
  }

  protected abstract tick(
    context: TriggerContext,
    state: MetaState<z.infer<T>>
  ): boolean;

  abstract serialize(): StoredTriggerDefinition;

  visit(visitor: (trigger: Trigger) => void): void {
    visitor(this);
  }
}

export abstract class BaseStatelessTrigger extends BaseTrigger<ZodVoid> {
  abstract kind: string;
  public readonly schema = z.void();
}
