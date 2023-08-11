import type { ClientInput } from "@/client/game/context_managers/input";
import type { ClickableItemInfo } from "@/client/game/interact/item_types/clickable_item_script";
import { PressAndHoldItemSpec } from "@/client/game/interact/item_types/press_and_hold_item_spec";
import {
  stubClientResources,
  stubClientResourceValue,
} from "@/client/game/interact/item_types/test_helpers";
import type { PressAndHoldInfo } from "@/client/game/interact/types";
import type { LocalPlayer } from "@/client/game/resources/local_player";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { Disposable } from "@/shared/disposable";
import type { Inventory } from "@/shared/ecs/gen/components";
import { countOf } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import assert from "assert";

import { stubInterface } from "ts-sinon";

describe("Press and Hold Item", () => {
  before(async () => {
    await loadVoxeloo();
  });

  it("finishing channel warps home", () => {
    const itemAndCount = countOf(BikkieIds.homestone, undefined, 1n);
    const itemInfo: ClickableItemInfo = {
      itemRef: {
        kind: "hotbar",
        idx: 0,
      },
      itemAndCount,
      item: itemAndCount.item,
    };

    const stubbedInput = stubInterface<Disposable<ClientInput>>({
      motion: 1,
    });

    const channelingInfo: PressAndHoldInfo = {
      activeAction: {
        action: "warpHome",
      },
      finished: false,
      percentage: 0,
      start: 0,
    };

    const stubbedPlayer = stubInterface<LocalPlayer>();

    const stubbedInventory = stubInterface<Inventory>();
    stubbedInventory.hotbar = [itemAndCount];

    stubbedPlayer.pressAndHoldItemInfo = channelingInfo;

    const userId = 123 as BiomesId;

    const stubbedResources = stubClientResources();
    stubClientResourceValue(stubbedResources, "/clock", {
      time: 100,
    });
    stubClientResourceValue(
      stubbedResources,
      "/scene/local_player",
      stubbedPlayer
    );
    stubClientResourceValue(
      stubbedResources,
      "/ecs/c/inventory",
      userId,
      stubbedInventory
    );

    const pressAndHoldItemScript = new PressAndHoldItemSpec(
      {
        userId,
        input: stubbedInput,
        resources: stubbedResources,
      },
      {
        holdLengthSeconds: () => 1,
        onFinishHold() {},
      }
    );

    pressAndHoldItemScript.onPrimaryHoldTick(itemInfo);

    assert.deepEqual(stubbedPlayer.pressAndHoldItemInfo, {
      activeAction: {
        action: "warpHome",
      },
      finished: true,
      percentage: 1,
      start: 0,
    });
  });
});
