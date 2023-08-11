import { getSecret } from "@/server/shared/secrets";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import { z } from "zod";

export const zVoicesListResponse = z.object({
  voices: z.array(
    z.object({
      name: z.string(),
      voiceId: z.string(),
    })
  ),
});

export type VoicesListResponse = z.infer<typeof zVoicesListResponse>;

interface ElevenLabsVoicesResponse {
  voices: {
    name: string;
    voice_id: string;
  }[];
}

export default biomesApiHandler(
  {
    auth: "required",
    response: zVoicesListResponse,
  },
  async () => {
    const key = getSecret("elevenlabs-api-key").trim();
    if (!key) {
      return { voices: [] };
    }
    const ret = await jsonFetch<ElevenLabsVoicesResponse>(
      "https://api.elevenlabs.io/v1/voices",
      {
        headers: {
          "xi-api-key": key,
        },
      }
    );

    return {
      voices: ret.voices.map((voice) => ({
        name: voice.name,
        voiceId: voice.voice_id,
      })),
    };
  }
);
