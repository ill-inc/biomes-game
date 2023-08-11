import type { TriggerContext } from "@/server/shared/triggers/core";
import {
  giveRewardsFromTriggerContext,
  takeItemsFromTriggerContext,
} from "@/server/shared/triggers/rewards";
import { BaseStatelessTrigger } from "@/server/shared/triggers/trigger";
import type { CompleteQuestStepAtMyRobotEvent } from "@/shared/firehose/events";
import type { BagSpec } from "@/shared/game/bag_spec";
import { bagSpecToItemBag } from "@/shared/game/items_serde";
import type { ItemBag } from "@/shared/game/types";
import type { BaseStoredTriggerDefinition } from "@/shared/triggers/base_schema";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { zCompleteQuestStepAtMyRobotTriggerDefinition } from "@/shared/triggers/schema";
import { ok } from "assert";

export class CompleteQuestStepAtMyRobotTrigger extends BaseStatelessTrigger {
  public readonly kind = "completeQuestStepAtMyRobot";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly allowDefaultNavigationAid: boolean,
    private readonly rewardsList?: ItemBag[],
    private readonly itemsToTake?: BagSpec
  ) {
    super(spec);
  }

  static deserialize(data: any): CompleteQuestStepAtMyRobotTrigger {
    const spec = zCompleteQuestStepAtMyRobotTriggerDefinition.parse(data);
    return new CompleteQuestStepAtMyRobotTrigger(
      spec,
      spec.allowDefaultNavigationAid,
      spec.rewardsList,
      spec.itemsToTake
    );
  }

  private findEvent(
    context: TriggerContext
  ): CompleteQuestStepAtMyRobotEvent | undefined {
    return context.events.find(
      (e) =>
        e.kind === "completeQuestStepAtMyRobot" &&
        e.challenge === context.rootId &&
        e.stepId === this.spec.id
    ) as CompleteQuestStepAtMyRobotEvent | undefined;
  }

  protected override maybeGiveRewards(context: TriggerContext) {
    const event = this.findEvent(context);
    ok(event);

    const rewardToGiveIndex =
      event.chosenRewardIndex === undefined ? 0 : event.chosenRewardIndex;

    if (this.rewardsList?.[rewardToGiveIndex]) {
      giveRewardsFromTriggerContext({
        context,
        bag: this.rewardsList[rewardToGiveIndex],
      });
    }
  }

  protected override maybeTakeItems(context: TriggerContext): boolean {
    if (!this.itemsToTake) {
      return true;
    }

    return takeItemsFromTriggerContext({
      context,
      bag: bagSpecToItemBag(this.itemsToTake),
    });
  }

  serialize(): StoredTriggerDefinition {
    return {
      ...this.spec,
      kind: this.kind,
      allowDefaultNavigationAid: this.allowDefaultNavigationAid,
      rewardsList: this.rewardsList,
    };
  }

  tick(context: TriggerContext): boolean {
    if (context.entity?.challenges()?.complete.has(context.rootId)) {
      return true;
    }
    return !!this.findEvent(context);
  }
}
