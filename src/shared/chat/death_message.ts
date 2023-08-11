import type { DeathMessage, DeathReason } from "@/shared/chat/messages";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type {
  ReadonlyDamageSource,
  ReadonlyOptionalDamageSource,
} from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import { idToNpcType } from "@/shared/npc/bikkie";

type EntityLookupFn = (id: BiomesId) => ReadonlyEntity | undefined;

// This is our opportunity to resolve any entity IDs to concrete data since
// referenced entities may not exist for all viewers of the death message at
// all times.
export function convertDamageSourceToDeathReason(
  lastDamageSource: ReadonlyDamageSource,
  lookupEntity: EntityLookupFn
): DeathReason {
  switch (lastDamageSource.kind) {
    case "attack":
      const killerName = (() => {
        const killer = lookupEntity(lastDamageSource.attacker);
        if (!killer) {
          return undefined;
        }
        if (killer.npc_metadata) {
          return `a ${idToNpcType(killer.npc_metadata.type_id).displayName}`;
        } else if (killer.label) {
          return killer.label.text;
        } else {
          return undefined;
        }
      })();
      if (!killerName) {
        return { kind: "unknown" };
      }
      return { kind: "attack", attacker: killerName };
    case "fall":
      return { kind: "fall", distance: lastDamageSource.distance };
    case "suicide":
      return { kind: "suicide" };
    case "drown":
      return { kind: "drown" };
    case "fire": // deprecated
    case "fireDamage":
    case "fireHeal":
      return { kind: "fire" };
    case "block":
      return {
        kind: "block",
        biscuitId: lastDamageSource.biscuitId,
      };
    case "despawnWand":
      return { kind: "despawnWand" };
    case "heal":
    case "npc":
      // No need to document this one in chat, it implies some kind of
      // "administrative" death, like a day NPC dying because it's night.
      return { kind: "unknown" };
  }
}

export function constructDeathMessage(
  lastDamageSource: ReadonlyOptionalDamageSource,
  lookupEntity: EntityLookupFn
): DeathMessage {
  return {
    kind: "death",
    deathReason: !lastDamageSource
      ? { kind: "unknown" }
      : convertDamageSourceToDeathReason(lastDamageSource, lookupEntity),
  };
}
