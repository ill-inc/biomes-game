import { makeEventHandler } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import { queryForTerrainInBox } from "@/server/logic/events/space_clipboard";
import { aabbToBox } from "@/shared/game/group";
import type { ShardId } from "@/shared/game/shard";
import { blockPos, voxelShard } from "@/shared/game/shard";
import { voxelsToAABB } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import { DefaultMap } from "@/shared/util/collections";
import { ok } from "assert";

export const placerWandEventHandler = makeEventHandler("placerWandEvent", {
  involves: (event) => ({
    player: q.player(event.id),
    terrain: queryForTerrainInBox(aabbToBox(voxelsToAABB(...event.positions))),
  }),
  apply: ({ player, terrain }, event, _context) => {
    const currentItem = player.inventory.get(event.item_ref);
    ok(currentItem && currentItem.item.action === "placerWand");

    const groupedByChunk = new DefaultMap<ShardId, Vec3[]>(() => []);
    for (const pos of event.positions) {
      groupedByChunk.get(voxelShard(...pos)).push(blockPos(...pos));
    }

    for (const shard of terrain) {
      for (const pos of groupedByChunk.get(shard.shardId)) {
        shard.mutablePlacer.set(...pos, player.id);
      }
    }
  },
});

export const clearPlacerEventHandler = makeEventHandler("clearPlacerEvent", {
  involves: (event) => ({
    player: q.player(event.id),
    terrain: queryForTerrainInBox(aabbToBox(voxelsToAABB(...event.positions))),
  }),
  apply: ({ player, terrain }, event, _context) => {
    const currentItem = player.inventory.get(event.item_ref);
    ok(currentItem && currentItem.item.action === "placerWand");

    const groupedByChunk = new DefaultMap<ShardId, Vec3[]>(() => []);
    for (const pos of event.positions) {
      groupedByChunk.get(voxelShard(...pos)).push(blockPos(...pos));
    }

    for (const shard of terrain) {
      for (const pos of groupedByChunk.get(shard.shardId)) {
        shard.mutablePlacer.set(...pos, 0);
      }
    }
  },
});
