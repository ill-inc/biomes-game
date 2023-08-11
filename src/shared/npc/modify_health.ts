import type { DeltaWith } from "@/shared/ecs/gen/delta";
import type { OptionalDamageSource } from "@/shared/ecs/gen/types";
import { log } from "@/shared/logging";
import { createCounter } from "@/shared/metrics/metrics";
import type { NpcType } from "@/shared/npc/bikkie";
import { idToNpcType } from "@/shared/npc/bikkie";

const npcDeaths = createCounter({
  name: "npc_deaths",
  help: "Number of NPC deaths.",
  labelNames: ["type", "reason"],
});

// How long the entity will persist after dying, before it is set to expire.
// We want there to be enough time to ensure that clients can play through
// any death animations and effects.
const NPC_EXPIRY_AFTER_DEATH_SECS = 30;

export function killNpc(
  npc: DeltaWith<"health" | "npc_metadata" | "rigid_body" | "position">,
  damageSource: OptionalDamageSource,
  secondsSinceEpoch: number
) {
  modifyNpcHealth(npc, 0, damageSource, secondsSinceEpoch);
}

export function modifyNpcHealth(
  npc: DeltaWith<"health" | "npc_metadata" | "rigid_body" | "position">,
  newHealth: number,
  damageSource: OptionalDamageSource,
  secondsSinceEpoch: number
) {
  const npcTypeId = npc.npcMetadata().type_id;
  const npcType = idToNpcType(npcTypeId);

  if (npc.health().hp <= 0 || npc.health().hp === newHealth) {
    return;
  }

  npc.mutableHealth().lastDamageSource = damageSource;
  npc.mutableHealth().lastDamageTime = secondsSinceEpoch;
  npc.mutableHealth().lastDamageAmount = newHealth - npc.health().hp;
  npc.mutableHealth().hp = newHealth;

  if (npc.health().hp > 0) {
    return;
  }

  onNpcDeath(npc, damageSource, secondsSinceEpoch, npcType);
}

function onNpcDeath(
  npc: DeltaWith<"health" | "npc_metadata">,
  damageSource: OptionalDamageSource,
  secondsSinceEpoch: number,
  npcType: NpcType
) {
  // Handle death of the NPC.
  const npcTypeName = npcType.name;

  // Another one bites the dust.
  const deathReasonText =
    damageSource?.kind === "npc"
      ? `npc/${damageSource.type.kind}`
      : damageSource === undefined
      ? "undefined"
      : damageSource.kind;
  npcDeaths.inc({
    type: npcTypeName,
    reason: deathReasonText,
  });

  log.debug(
    `NPC id "${npc.id}" (${npcTypeName}) has died (reason: "${deathReasonText}").`
  );

  // Reset their expiry to be much sooner, to clean up the
  // no-longer-active NPC.
  const newExpiryTime = secondsSinceEpoch + NPC_EXPIRY_AFTER_DEATH_SECS;
  if (!npc.expires() || npc.expires()!.trigger_at > newExpiryTime) {
    npc.mutableExpires().trigger_at = newExpiryTime;
  }
}
