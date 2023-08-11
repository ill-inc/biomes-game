// Logic shared by all muckers.

import { secondsSinceEpoch } from "@/shared/ecs/config";
import { distSq } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import type { SimulatedNpc } from "@/shared/npc/simulated";
import { ok } from "assert";
import { z } from "zod";

export const zFarFromHomeComponent = z.object({
  farFromHome: z
    .object({
      lastNearTime: z.number().optional(),
    })
    .default({ lastNearTime: undefined }),
});
export type FarFromHomeComponent = z.infer<typeof zFarFromHomeComponent>;

export function farFromHomeTick(
  npc: SimulatedNpc,
  home: ReadonlyVec3,
  farSecondsBeforeExpire: number,
  farDistance: number
) {
  if (!npc.state.farFromHome) {
    npc.mutableState().farFromHome = {};
    ok(npc.state.farFromHome);
  }

  const dSq = distSq(npc.position, home);
  if (dSq < farDistance ** 2) {
    if (npc.state.farFromHome.lastNearTime) {
      npc.mutableState().farFromHome!.lastNearTime = undefined;
    }
    return;
  }
  const now = secondsSinceEpoch();
  if (npc.state.farFromHome.lastNearTime === undefined) {
    npc.mutableState().farFromHome!.lastNearTime = now;
    return;
  }
  if (now - npc.state.farFromHome.lastNearTime > farSecondsBeforeExpire) {
    npc.kill({
      kind: "npc",
      type: { kind: "farFromHome" },
    });
  }
}
