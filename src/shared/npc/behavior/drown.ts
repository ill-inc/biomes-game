// Logic shared by all muckers.

import { secondsSinceEpoch } from "@/shared/ecs/config";
import { CollisionHelper } from "@/shared/game/collision";
import { centerAABB } from "@/shared/math/linear";
import type { AABB } from "@/shared/math/types";
import type { NpcTickResourcePaths } from "@/shared/npc/environment";
import type { SimulatedNpc } from "@/shared/npc/simulated";
import type { TypedResources } from "@/shared/resources/types";
import { z } from "zod";

export const zDrownComponent = z.object({
  drown: z.object({
    submergedSinceSeconds: z.number(),
    previousDamageSeconds: z.number().optional(),
  }),
});
export type DrownComponent = z.infer<typeof zDrownComponent>;

interface DrownOptions {
  // Start damaging the NPC after this many seconds have passed.
  damageStartSeconds?: number;
  // Apply damage after every interval of this length, after we start to
  // deal damage.
  damageIntervalSeconds?: number;
  // Do this much damage every time damage is applied, as a fraction of max
  // health.
  damageMaxHpFraction?: number;
  // Determines when the NPC drowns. When `breathesAir` is true, the entity
  // will drown when it is in water and when it's false, the entity will
  // drown when its out of water.
  breathingType?: "air" | "water";
}

const DEFAULT_DAMAGE_START_SECONDS = 10;
const DEFAULT_DAMAGE_INTERVAL_SECONDS = 2;
const DEFAULT_DAMAGE_MAX_HP_FRACTION = 0.3;
const DEFAULT_BREATHING_TYPE = "air";

export function drownTick(
  resources: TypedResources<NpcTickResourcePaths>,
  npc: SimulatedNpc,
  aabb: Readonly<AABB>,
  options?: DrownOptions
) {
  const submergedInWater = CollisionHelper.pointInAABB(
    (id) => resources.get("/water/boxes", id),
    centerAABB(aabb)
  );

  const isDrowning =
    (options?.breathingType ?? DEFAULT_BREATHING_TYPE) === "air"
      ? submergedInWater
      : !submergedInWater;

  if (!isDrowning) {
    if (npc.state.drown !== undefined) {
      delete npc.mutableState().drown;
    }

    return [];
  }

  const now = secondsSinceEpoch();
  if (npc.state.drown === undefined) {
    npc.mutableState().drown = {
      submergedSinceSeconds: now,
    };
    return [];
  }

  const applyDamage = () => {
    npc.mutableState().drown!.previousDamageSeconds = now;

    const outDamageFraction =
      options?.damageMaxHpFraction ?? DEFAULT_DAMAGE_MAX_HP_FRACTION;
    const damage = Math.ceil(outDamageFraction * npc.health.maxHp);
    npc.damage(damage, { kind: "drown" });
  };

  if (npc.state.drown.previousDamageSeconds === undefined) {
    const timeSinceSubmerged = now - npc.state.drown.submergedSinceSeconds;
    if (
      timeSinceSubmerged >
      (options?.damageStartSeconds ?? DEFAULT_DAMAGE_START_SECONDS)
    ) {
      applyDamage();
    }
  } else {
    const timeSinceLastDamage = now - npc.state.drown.previousDamageSeconds;
    if (
      timeSinceLastDamage >
      (options?.damageIntervalSeconds ?? DEFAULT_DAMAGE_INTERVAL_SECONDS)
    ) {
      applyDamage();
    }
  }
}
