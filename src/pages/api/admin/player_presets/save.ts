import type { AskApi } from "@/server/ask/api";
import { GameEvent } from "@/server/shared/api/game_event";
import type { WorldApi } from "@/server/shared/world/api";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { AdminSavePresetEvent } from "@/shared/ecs/gen/events";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { z } from "zod";

export const zSavePresetRequest = z.object({
  preset: z.union([zBiomesId, z.string()]),
  playerId: zBiomesId,
});

export type SavePresetRequest = z.infer<typeof zSavePresetRequest>;

export const zSavePresetResponse = z.object({
  id: zBiomesId,
});
export type SavePresetResponse = z.infer<typeof zSavePresetResponse>;

export async function resolvePreset(
  presetQuery: string | BiomesId,
  worldApi: WorldApi,
  askApi: AskApi
) {
  let presetId: BiomesId | undefined;
  let presetName: string | undefined;
  if (typeof presetQuery === "number") {
    // Number: Look for the preset by ID
    const preset = await worldApi.get(presetQuery);
    if (preset) {
      presetId = presetQuery;
      presetName = preset?.label()?.text || presetQuery.toString();
    } else {
      // Couldn't find one, use the number as a name and search
      presetQuery = presetQuery.toString();
    }
  }
  if (typeof presetQuery === "string") {
    // Find the preset by name
    const presets = await askApi.getByKeys({
      kind: "presetByLabel",
      label: presetQuery,
    });
    presetName = presetQuery;
    if (presets.length === 0) {
      // No existing preset
    } else {
      okOrAPIError(presets.length === 1, "internal_error");
      const preset = presets[0];
      presetId = preset.id;
    }
  }
  if (presetId && presetName) {
    return { id: presetId, name: presetName };
  }
}

export default biomesApiHandler(
  {
    auth: "admin",
    body: zSavePresetRequest,
    response: zSavePresetResponse,
  },
  async ({
    context: { logicApi, idGenerator, worldApi, askApi },
    body: { preset: presetQuery, playerId },
    auth: { userId },
  }) => {
    let resolvedPreset = await resolvePreset(presetQuery, worldApi, askApi);
    if (!resolvedPreset) {
      // No Preset. Create one now
      resolvedPreset = {
        id: await idGenerator.next(),
        name: presetQuery.toString(),
      };
    }
    okOrAPIError(resolvedPreset, "not_found", "Preset not found");

    log.info(
      `Setting preset ${resolvedPreset.name} for player ${playerId} (Requested by ${userId})`
    );
    const event = new GameEvent(
      userId,
      new AdminSavePresetEvent({
        id: userId,
        name: resolvedPreset.name,
        preset_id: resolvedPreset.id,
        player_id: playerId,
      })
    );
    await logicApi.publish(event);
    return { id: resolvedPreset.id };
  }
);
