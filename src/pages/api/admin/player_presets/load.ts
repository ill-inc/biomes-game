import { resolvePreset } from "@/pages/api/admin/player_presets/save";
import { GameEvent } from "@/server/shared/api/game_event";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { AdminLoadPresetEvent } from "@/shared/ecs/gen/events";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zLoadPresetRequest = z.object({
  preset: z.union([zBiomesId, z.string()]),
  playerId: zBiomesId,
});
export type LoadPresetRequest = z.infer<typeof zLoadPresetRequest>;

export const zLoadPresetResponse = z.object({
  pos: z.array(z.number()),
});
export type LoadPresetResponse = z.infer<typeof zLoadPresetResponse>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zLoadPresetRequest,
    response: zLoadPresetResponse,
  },
  async ({
    context: { logicApi, worldApi, askApi },
    body: { preset: presetQuery, playerId },
    auth: { userId },
  }) => {
    const resolvedPreset = await resolvePreset(presetQuery, worldApi, askApi);
    okOrAPIError(resolvedPreset, "not_found");
    const presetEntity = await worldApi.get(resolvedPreset.id);
    const pos = presetEntity?.position()?.v;
    okOrAPIError(pos, "not_found", "Preset position invalid");
    const event = new GameEvent(
      userId,
      new AdminLoadPresetEvent({
        id: userId,
        preset_id: resolvedPreset.id,
        player_id: playerId,
      })
    );
    await logicApi.publish(event);
    return { pos: [...pos] };
  }
);
