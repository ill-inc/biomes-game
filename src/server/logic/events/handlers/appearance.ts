import { makeEventHandler } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import { BikkieIds } from "@/shared/bikkie/ids";
import { anItem } from "@/shared/game/item";
import { countOf } from "@/shared/game/items";
import { ok } from "assert";

const appearanceChangeEventHandler = makeEventHandler("appearanceChangeEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({ player: event.id }),
  apply: ({ player }, event) => {
    player.setAppearanceComponent({ appearance: event.appearance });
  },
});

const hairTransplantEventHandler = makeEventHandler("hairTransplantEvent", {
  mergeKey: (event) => event.id,
  involves: (event) => ({ player: q.player(event.id) }),
  apply: ({ player }, event) => {
    const hairItem = anItem(event.newHairId);
    ok(!hairItem || hairItem.wearAsHair);

    player.inventory.set(
      {
        kind: "wearable",
        key: BikkieIds.hair,
      },
      hairItem ? countOf(hairItem, 1n) : undefined
    );
  },
});

export const allAppearanceEventHandlers = [
  appearanceChangeEventHandler,
  hairTransplantEventHandler,
];
