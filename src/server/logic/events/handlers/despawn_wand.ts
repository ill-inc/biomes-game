import { makeEventHandler } from "@/server/logic/events/core";
import { q } from "@/server/logic/events/query";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { idToNpcType } from "@/shared/npc/bikkie";
import { killNpc } from "@/shared/npc/modify_health";
import { ok } from "assert";

export const despawnWandEventHandler = makeEventHandler("despawnWandEvent", {
  involves: (event) => ({
    player: q.player(event.id),
    entity: q
      .id(event.entityId)
      .with("health", "npc_metadata", "position", "rigid_body", "size"),
  }),
  apply: ({ player, entity }, event) => {
    const currentItem = player.inventory.get(event.item_ref);
    const roles = player.roles() ?? new Set();
    ok(entity);
    ok(roles.has("admin"));
    ok(currentItem && currentItem.item.action === "despawnWand");
    const typeId = entity.npcMetadata()?.type_id;
    if (typeId === undefined) {
      return;
    }
    const type = idToNpcType(typeId);
    // Don't allow despawning quest givers
    if (type.behavior.questGiver) {
      return;
    }
    killNpc(entity, { kind: "despawnWand" }, secondsSinceEpoch());
  },
});
