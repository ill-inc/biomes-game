import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import type { TriggerContext } from "@/server/shared/triggers/core";
import type { Delta } from "@/shared/ecs/gen/delta";
import type { ItemBag } from "@/shared/ecs/gen/types";
import type { FirehoseEvent } from "@/shared/firehose/events";
import { log } from "@/shared/logging";

export function giveRewardsFromTriggerContext({
  context,
  bag,
}: {
  context: {
    entity: Delta;
    publish: (event: FirehoseEvent) => void;
  };
  bag?: ItemBag;
}) {
  if (!bag) {
    return;
  }
  try {
    new PlayerInventoryEditor(
      context,
      context.entity
    ).giveWithInventoryOverflow(bag);
  } catch (error: any) {
    log.error("Error granting rewards", { error });
  }
}

export function takeItemsFromTriggerContext({
  context,
  bag,
}: {
  context: TriggerContext;
  bag: ItemBag;
}): boolean {
  const inventory = new PlayerInventoryEditor(context, context.entity);
  return inventory.tryTakeBag(bag, {
    respectPayload: false,
  });
}
