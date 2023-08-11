import { GameEvent } from "@/server/shared/api/game_event";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { BikkieRuntime } from "@/shared/bikkie/active";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import { AdminResetChallengesEvent } from "@/shared/ecs/gen/events";
import type { ChallengeState } from "@/shared/ecs/gen/types";
import { zChallengeState } from "@/shared/ecs/gen/types";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId, zBiomesId } from "@/shared/ids";
import { entries } from "lodash";
import { z } from "zod";

export const zResetQuestsRequest = z.object({
  userId: zBiomesId,
  challengeStateMap: z.record(z.string(), zChallengeState),
  resetAll: z.boolean().optional(),
});

export type ResetQuestsRequest = z.infer<typeof zResetQuestsRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zResetQuestsRequest,
  },
  async ({
    context: { logicApi, worldApi },
    body: { userId, challengeStateMap, resetAll },
  }) => {
    const current = await worldApi.get(userId);
    if (!current?.hasChallenges()) {
      return;
    }

    if (resetAll) {
      // Enumerate all challenges they have currently.
      for (const c of [
        ...current.challenges().in_progress,
        ...current.challenges().complete,
        ...current.challenges().available,
        ...current.challenges().started_at.keys(),
      ]) {
        challengeStateMap[c] = "start";
      }
      // Also just go ahead and enumerate all challenges that exist.
      for (const quest of BikkieRuntime.get().getBiscuits(
        bikkie.schema.quests
      )) {
        challengeStateMap[quest.id] = "start";
      }
    }

    const challengeStatesAsMap = new Map<BiomesId, ChallengeState>();
    for (const [rawId, state] of entries(challengeStateMap)) {
      if (!state) {
        continue;
      }

      const id = parseBiomesId(rawId);
      const quest = anItem(id);
      challengeStatesAsMap.set(id, quest ? state : "start");
    }

    await logicApi.publish(
      new GameEvent(
        userId,
        new AdminResetChallengesEvent({
          id: userId,
          challenge_states: challengeStatesAsMap,
        })
      )
    );
  }
);
