import type { TriggerContext } from "@/server/shared/triggers/core";
import {
  giveRewardsFromTriggerContext,
  takeItemsFromTriggerContext,
} from "@/server/shared/triggers/rewards";
import { BaseStatelessTrigger } from "@/server/shared/triggers/trigger";
import type { CompleteQuestStepAtEntityEvent } from "@/shared/firehose/events";
import type { BagSpec } from "@/shared/game/bag_spec";
import { bagSpecToItemBag } from "@/shared/game/items_serde";
import type { ItemBag } from "@/shared/game/types";
import type { BiomesId } from "@/shared/ids";
import type { BaseStoredTriggerDefinition } from "@/shared/triggers/base_schema";
import type { StoredTriggerDefinition } from "@/shared/triggers/schema";
import { zChallengeClaimRewardsTriggerDefinition } from "@/shared/triggers/schema";
import { ok } from "assert";

export class ChallengeClaimRewardsTrigger extends BaseStatelessTrigger {
  public readonly kind = "challengeClaimRewards";

  constructor(
    spec: BaseStoredTriggerDefinition,
    public readonly returnEntityId: BiomesId,
    public readonly allowDefaultNavigationAid: boolean,
    private readonly rewardsList?: ItemBag[],
    private readonly itemsToTake?: BagSpec
  ) {
    super(spec);
  }

  static deserialize(data: any): ChallengeClaimRewardsTrigger {
    const spec = zChallengeClaimRewardsTriggerDefinition.parse(data);
    return new ChallengeClaimRewardsTrigger(
      spec,
      spec.returnNpcTypeId,
      spec.allowDefaultNavigationAid,
      spec.rewardsList,
      spec.itemsToTake
    );
  }

  private findEvent(
    context: TriggerContext
  ): CompleteQuestStepAtEntityEvent | undefined {
    return context.events.find(
      (e) =>
        e.kind === "completeQuestStepAtEntity" &&
        e.challenge === context.rootId &&
        e.claimFromEntityId === this.returnEntityId &&
        e.stepId === this.spec.id
    ) as CompleteQuestStepAtEntityEvent | undefined;
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
      returnNpcTypeId: this.returnEntityId,
      allowDefaultNavigationAid: this.allowDefaultNavigationAid,
      rewardsList: this.rewardsList,
    };
  }

  tick(context: TriggerContext): boolean {
    if (context.entity?.challenges()?.complete.has(context.rootId)) {
      return true;
    }
    const ret = !!this.findEvent(context);
    return ret;
  }
}
