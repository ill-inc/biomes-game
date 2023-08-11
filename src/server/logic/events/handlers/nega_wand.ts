import { makeEventHandler } from "@/server/logic/events/core";
import { AabbTerrainIterator } from "@/server/logic/events/occupancy";
import { q } from "@/server/logic/events/query";
import { queryForTerrainInBox } from "@/server/logic/events/space_clipboard";
import { boxToAabb } from "@/shared/game/group";
import { zBiomesId } from "@/shared/ids";
import { zAABB } from "@/shared/math/types";
import { ok } from "assert";
import { z } from "zod";

export const zClipboardWandItemData = z.object({
  stowed_entity_id: zBiomesId,
  stowed_box: zAABB,
});

export type ClipboardWandItemData = z.infer<typeof zClipboardWandItemData>;

export const negaWandRestoreEventHandler = makeEventHandler(
  "negaWandRestoreEvent",
  {
    involves: (event) => ({
      player: q.player(event.id),
      terrain: queryForTerrainInBox(event.box),
    }),
    apply: ({ player, terrain }, event, _context) => {
      const currentItem = player.inventory.get(event.item_ref);
      ok(currentItem && currentItem.item.action === "negaWand");

      const terrainIterator = new AabbTerrainIterator(
        terrain,
        boxToAabb(event.box)
      );
      for (const { blockPos, terrain } of terrainIterator) {
        terrain.restoreTerrainToSeedAt(blockPos);
      }
    },
  }
);
