import { GameEvent } from "@/server/shared/api/game_event";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import type { AnyEvent } from "@/shared/ecs/gen/events";
import { EventSerde } from "@/shared/ecs/gen/json_serde";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zPublishEcsEvents = z.object({
  userIdsAndEventBlobs: z.tuple([zBiomesId, z.string()]).array(),
});

export type PublishEcsEventsRequest = z.infer<typeof zPublishEcsEvents>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zPublishEcsEvents,
  },
  async ({ context: { logicApi }, body: { userIdsAndEventBlobs } }) => {
    const gameEvents = userIdsAndEventBlobs.map(
      ([userId, eventBlob]) =>
        new GameEvent(
          userId,
          EventSerde.deserialize(JSON.parse(eventBlob)) as AnyEvent
        )
    );
    await logicApi.publish(...gameEvents);
  }
);
