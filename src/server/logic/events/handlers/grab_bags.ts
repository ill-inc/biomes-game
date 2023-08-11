import { makeEventHandler } from "@/server/logic/events/core";
import { staleOkDistance } from "@/server/logic/events/handlers/distance";
import { q } from "@/server/logic/events/query";
import { PlayerInventoryEditor } from "@/server/logic/inventory/player_inventory_editor";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { Acquisition, Expires } from "@/shared/ecs/gen/components";
import { assertNever } from "@/shared/util/type_helpers";

// Buffer for the distance a player moved once a PickUpEvent has been fired.
const PICKUP_BUFFER_DISTANCE = 1.0;

export const pickUpEventHandler = makeEventHandler("pickUpEvent", {
  mergeKey: (event) => `${event.id}:${event.item}`,
  involves: (event) => ({
    player: q.id(event.id).with("inventory"),
    item: q.id(event.item).with("grab_bag"),
  }),
  apply: ({ player, item }, _event, context) => {
    if (
      staleOkDistance(player, item) >
      CONFIG.gameDropPickupDistance + PICKUP_BUFFER_DISTANCE
    ) {
      return;
    }

    // Filter specific entities from picking up this grab bag if applicable
    const filter = item.grabBag().filter;
    let targettedForPlayer = false;
    if (filter) {
      if (!filter.expiry || secondsSinceEpoch() < filter.expiry) {
        const playerSelected = filter.entity_ids.has(player.id);
        switch (filter.kind) {
          case "only":
            if (!playerSelected) {
              return;
            }
            targettedForPlayer = true;
            break;
          case "block":
            if (playerSelected) {
              return;
            }
            break;
          default:
            assertNever(filter);
        }
      }
    }

    const inventory = new PlayerInventoryEditor(context, player);
    inventory.giveOrThrow(
      item.grabBag().slots,
      item.grabBag().mined && (!filter || targettedForPlayer)
    );
    item.setAcquisition(
      Acquisition.create({
        acquired_by: player.id,
        items: item.grabBag().slots,
      })
    );
    item.setExpires(
      Expires.create({
        trigger_at: secondsSinceEpoch() + CONFIG.gameDropPickupExpirationSecs,
      })
    );
    item.clearGrabBag();
  },
});
