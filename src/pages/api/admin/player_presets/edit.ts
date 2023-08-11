import { GameEvent } from "@/server/shared/api/game_event";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { AdminEditPresetEvent } from "@/shared/ecs/gen/events";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zEditPlayerPresetRequest = z.object({
  id: zBiomesId,
  name: z.string(),
});

export type EditPlayerPresetRequest = z.infer<typeof zEditPlayerPresetRequest>;

export const zEditPlayerPresetResponse = z.boolean();

export type EditPlayerPresetResponse = z.infer<
  typeof zEditPlayerPresetResponse
>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zEditPlayerPresetRequest,
    response: zEditPlayerPresetResponse,
  },
  async ({
    context: { logicApi, askApi },
    body: { id, name },
    auth: { userId },
  }) => {
    const existingPresetByName = await askApi.getByKeys({
      kind: "presetByLabel",
      label: name,
    });
    if (existingPresetByName.length > 0 && existingPresetByName[0].id !== id) {
      return false;
    }
    const event = new GameEvent(
      userId,
      new AdminEditPresetEvent({ id: id, preset_id: id, name })
    );
    await logicApi.publish(event);
    return true;
  }
);
