import { GameEvent } from "@/server/shared/api/game_event";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { AdminResetChallengesEvent } from "@/shared/ecs/gen/events";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zProgressQuestRequest = z.object({
  userId: zBiomesId,
  questId: zBiomesId,
});

export type ProgressQuestsRequest = z.infer<typeof zProgressQuestRequest>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zProgressQuestRequest,
  },
  async ({
    context: { worldApi, logicApi, firehose },
    body: { userId, questId },
  }) => {
    const current = await worldApi.get(userId);
    if (!current?.hasChallenges()) {
      return;
    }
    if (current.challenges().available.has(questId)) {
      // Force unlock
      await logicApi.publish(
        new GameEvent(
          userId,
          new AdminResetChallengesEvent({
            id: userId,
            challenge_states: new Map([[questId, "in_progress"]]),
          })
        )
      );
    } else {
      // Force progress
      await firehose.publish({
        kind: "adminProgressQuestStep",
        entityId: userId,
        questId: questId,
      });
    }
  }
);
