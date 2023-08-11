import type { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import type { ChangeToApply } from "@/shared/api/transaction";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { zBiomesId } from "@/shared/ids";
import { idToNpcType, isNpcTypeId } from "@/shared/npc/bikkie";
import { killNpc } from "@/shared/npc/modify_health";
import { ok } from "assert";
import { z } from "zod";

export const zKillAllNpcsRequest = z.object({
  userId: zBiomesId,
  // If specified, kills only NPCs of this type.
  npcTypeId: zBiomesId.optional(),
});

export type KillAllNpcsRequest = z.infer<typeof zKillAllNpcsRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zKillAllNpcsRequest,
  },
  async ({ context: { worldApi, askApi }, body: { npcTypeId } }) => {
    ok(npcTypeId === undefined || isNpcTypeId(npcTypeId));

    const allNpcs = await askApi.scanAll("npcs");

    // Filters NPCs when an "expire all" command is sent...  Filtered NPCs need
    // to be targeted specifically with an expire command if it's desired that
    // they expire.
    const expiresOnExpireAllCommand = (e: LazyEntity) => {
      if (e.hasQuestGiver()) {
        return false;
      }
      const typeId = e.npcMetadata()?.type_id;
      if (typeId === undefined) {
        return false;
      }
      const type = idToNpcType(typeId);

      // By default don't kill quest giver NPCs, as they're placed manually
      // around the world.
      return !type.behavior.questGiver;
    };

    let npcsToExpire =
      npcTypeId === undefined
        ? allNpcs.filter(expiresOnExpireAllCommand)
        : allNpcs.filter((e) => e.npcMetadata()?.type_id === npcTypeId);

    npcsToExpire = npcsToExpire.filter(
      (e) =>
        // All NPCs should have a health component, but filter just in case.
        e.health() &&
        // Only ever expire spawned NPCs, not admin created ones.
        e.npcMetadata()?.spawn_event_id
    );

    const transactions = npcsToExpire.map((e) => {
      const patchableNpc = e.edit();
      if (
        !patchableNpc.has("health", "npc_metadata", "rigid_body", "position")
      ) {
        return {};
      }
      killNpc(
        patchableNpc,
        { kind: "npc", type: { kind: "adminKill" } },
        secondsSinceEpoch()
      );
      const entityDelta = patchableNpc.finish();
      if (!entityDelta) {
        return {};
      }
      return <ChangeToApply>{
        changes: [
          {
            kind: "update",
            entity: entityDelta,
          },
        ],
      };
    });

    await worldApi.apply(transactions);
  }
);
