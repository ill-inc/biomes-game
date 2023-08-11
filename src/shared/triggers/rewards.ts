import { itemBagToString, stringToItemBag } from "@/shared/game/items_serde";
import type { ItemBag } from "@/shared/game/types";
import type { StoredRewards } from "@/shared/triggers/base_schema";
import type { CustomSerializedType } from "@/shared/zrpc/custom_types";

export class Rewards implements CustomSerializedType<Rewards> {
  constructor(public items?: ItemBag) {}

  prepareForZrpc() {
    return serializeRewards(this);
  }
}

export function deserializeRewards(stored: StoredRewards): Rewards {
  return new Rewards(stored.items ? stringToItemBag(stored.items) : undefined);
}

export function serializeRewards(rewards: Rewards): StoredRewards {
  return {
    items:
      rewards.items && rewards.items.size > 0
        ? itemBagToString(rewards.items)
        : undefined,
  };
}
