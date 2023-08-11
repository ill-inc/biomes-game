import { makeEventHandler, newId, newIds } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import {
  copySpace,
  cutSpace,
  deleteSpace,
  discardSpaceClipboard,
  pasteSpace,
  queryForRelevantEntities,
  queryForSpaceClipboardEntity,
  queryForTerrainInBox,
} from "@/server/logic/events/space_clipboard";
import { attribs } from "@/shared/bikkie/schema/attributes";
import { boxToAabb } from "@/shared/game/group";
import { anItem } from "@/shared/game/item";
import { countOf } from "@/shared/game/items";
import { zBiomesId } from "@/shared/ids";
import { zAABB } from "@/shared/math/types";
import { ok } from "assert";
import { z } from "zod";

export const zClipboardWandItemData = z.object({
  stowed_entity_id: zBiomesId,
  stowed_box: zAABB,
});

export type ClipboardWandItemData = z.infer<typeof zClipboardWandItemData>;

const spaceClipboardWandCutEventHandler = makeEventHandler(
  "spaceClipboardWandCutEvent",
  {
    prepareInvolves: (event) => ({
      terrain: queryForTerrainInBox(event.box),
    }),
    prepare: ({ terrain }, event, { voxeloo }) => ({
      terrainRelevantEntityIds: queryForRelevantEntities(
        voxeloo,
        terrain,
        boxToAabb(event.box)
      ),
    }),
    involves: (event, { terrainRelevantEntityIds }) => ({
      player: q.player(event.id),
      terrain: queryForTerrainInBox(event.box),
      terrainRelevantEntities: q.ids(terrainRelevantEntityIds),
      stowId: newId(),
    }),
    apply: (
      { player, terrain, terrainRelevantEntities, stowId },
      event,
      context
    ) => {
      const currentItem = player.inventory.get(event.item_ref);
      ok(currentItem && currentItem.item.action === "spaceClipboard");

      ok(currentItem.item.data === undefined);

      const spaceEntity = context.create({
        id: stowId,
      });

      cutSpace(
        context.voxeloo,
        spaceEntity,
        boxToAabb(event.box),
        terrain,
        terrainRelevantEntities
      );

      const newData = JSON.stringify(<ClipboardWandItemData>{
        stowed_entity_id: spaceEntity.id,
        stowed_box: boxToAabb(event.box),
      });
      const newItem = anItem(currentItem.item.id, {
        ...currentItem.item.payload,
        [attribs.data.id]: newData,
      });

      player.inventory.set(event.item_ref, countOf(newItem, currentItem.count));
    },
  }
);

const spaceClipboardWandCopyEventHandler = makeEventHandler(
  "spaceClipboardWandCopyEvent",
  {
    prepareInvolves: (event) => ({
      terrain: queryForTerrainInBox(event.box),
    }),
    prepare: ({ terrain }, event, { voxeloo }) => ({
      terrainRelevantEntityIds: queryForRelevantEntities(
        voxeloo,
        terrain,
        boxToAabb(event.box)
      ),
    }),
    involves: (event, { terrainRelevantEntityIds }) => ({
      player: q.player(event.id),
      terrain: queryForTerrainInBox(event.box),
      terrainRelevantEntities: q.ids(terrainRelevantEntityIds),
      clonedEntityIds: newIds(terrainRelevantEntityIds.length),
      stowId: newId(),
    }),
    apply: (
      { player, terrain, terrainRelevantEntities, stowId, clonedEntityIds },
      event,
      context
    ) => {
      const currentItem = player.inventory.get(event.item_ref);
      ok(currentItem && currentItem.item.action === "spaceClipboard");

      ok(currentItem.item.data === undefined);

      const clipboardEntity = context.create({
        id: stowId,
      });
      copySpace(
        clipboardEntity,
        boxToAabb(event.box),
        terrain,
        terrainRelevantEntities,
        clonedEntityIds,
        context
      );

      const newData = JSON.stringify(<ClipboardWandItemData>{
        stowed_entity_id: clipboardEntity.id,
        stowed_box: boxToAabb(event.box),
      });
      const newItem = anItem(currentItem.item.id, {
        ...currentItem.item.payload,
        [attribs.data.id]: newData,
      });

      player.inventory.set(event.item_ref, countOf(newItem, currentItem.count));
    },
  }
);

const spaceClipboardWandPasteEventHandler = makeEventHandler(
  "spaceClipboardWandPasteEvent",
  {
    prepareInvolves: (event) => ({
      terrain: queryForTerrainInBox(event.new_box),
      stowedEntity: queryForSpaceClipboardEntity(event.space_entity_id),
    }),
    prepare: ({ terrain, stowedEntity }, event, { voxeloo }) => ({
      terrainRelevantEntityIds: queryForRelevantEntities(
        voxeloo,
        terrain,
        boxToAabb(event.new_box)
      ),
      stowedRelevantEntityIds: stowedEntity.grouped_entities?.ids ?? [],
    }),
    involves: (
      event,
      { terrainRelevantEntityIds, stowedRelevantEntityIds }
    ) => ({
      player: q.player(event.id),
      terrain: queryForTerrainInBox(event.new_box),
      terrainRelevantEntities: q.ids(terrainRelevantEntityIds),
      stowedEntity: queryForSpaceClipboardEntity(event.space_entity_id),
      stowedRelevantEntities: q.ids(stowedRelevantEntityIds).includeIced(),
    }),
    apply: (
      {
        player,
        terrain,
        terrainRelevantEntities,
        stowedEntity,
        stowedRelevantEntities,
      },
      event,
      context
    ) => {
      const currentItem = player.inventory.get(event.item_ref);
      ok(currentItem && currentItem.item.action === "spaceClipboard");

      const data = zClipboardWandItemData.parse(
        JSON.parse(currentItem.item.data ?? "")
      );

      ok(data.stowed_entity_id === stowedEntity.id);

      deleteSpace(
        boxToAabb(event.new_box),
        terrain,
        terrainRelevantEntities,
        context
      );

      pasteSpace(
        context.voxeloo,
        stowedEntity,
        boxToAabb(event.new_box),
        terrain,
        stowedRelevantEntities
      );

      context.delete(stowedEntity.id);

      const newPayload = { ...currentItem.item.payload };
      delete newPayload[attribs.data.id];
      const newItem = anItem(currentItem.item.id, newPayload);
      player.inventory.set(event.item_ref, countOf(newItem, currentItem.count));
    },
  }
);

const spaceClipboardWandDiscardEventHandler = makeEventHandler(
  "spaceClipboardWandDiscardEvent",
  {
    involves: (event) => ({
      player: q.player(event.id),
      stowedEntity: queryForSpaceClipboardEntity(event.space_entity_id),
    }),
    apply: ({ player, stowedEntity }, event, context) => {
      const currentItem = player.inventory.get(event.item_ref);
      ok(currentItem && currentItem.item.action === "spaceClipboard");

      const data = zClipboardWandItemData.parse(
        JSON.parse(currentItem.item.data ?? "")
      );

      ok(data.stowed_entity_id === stowedEntity.id);
      discardSpaceClipboard(stowedEntity, context);

      const newPayload = { ...currentItem.item.payload };
      delete newPayload[attribs.data.id];
      const newItem = anItem(currentItem.item.id, newPayload);
      player.inventory.set(event.item_ref, countOf(newItem, currentItem.count));
    },
  }
);

export const allSpaceStowEventHandlers = [
  spaceClipboardWandCutEventHandler,
  spaceClipboardWandCopyEventHandler,
  spaceClipboardWandPasteEventHandler,
  spaceClipboardWandDiscardEventHandler,
];
