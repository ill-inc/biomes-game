import { getSecret } from "@/server/shared/secrets";
import { uploadToBucket } from "@/server/web/cloud_storage/cloud_storage";
import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { APIError } from "@/shared/api/errors";
import { log } from "@/shared/logging";
import { jsonPostAnyResponse } from "@/shared/util/fetch_helpers";
import { hash as md5 } from "spark-md5";
import { z } from "zod";

export const zChatVoiceRequest = z.object({
  text: z.string(),
  voice: z.string(),
  language: z.string().optional(),
});

export type ChatVoiceRequest = z.infer<typeof zChatVoiceRequest>;

export const zChatVoiceResponse = z.object({
  url: z.string(),
});

export type ChatVoiceResponse = z.infer<typeof zChatVoiceResponse>;

function hashChatVoiceRequest(request: ChatVoiceRequest): string {
  const language = (request.language ?? "").split("-")[0];
  const languageTag = language === "en" ? "" : `:${language}`;
  return md5(`${request.voice}:${request.text}${languageTag}`);
}

export default biomesApiHandler(
  {
    auth: "required",
    body: zChatVoiceRequest,
    response: zChatVoiceResponse,
  },
  async ({ context: { db }, body: { text, voice, language } }) => {
    // Check cache.
    const hash = hashChatVoiceRequest({ text, voice });
    const doc = await db.collection("voices-cache").doc(hash).get();
    if (doc.exists) {
      // Return cached URL.
      return { url: doc.data()!.url };
    }

    const key = getSecret("elevenlabs-api-key").trim();
    okOrAPIError(!!key, "killswitched");

    // Get voice audio from Eleven Labs.
    const response = await jsonPostAnyResponse(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`,
      {
        text: text.trim(),
        optimize_streaming_latency: 4,
        model_id:
          language === "en"
            ? "eleven_monolingual_v1"
            : "eleven_multilingual_v1",
      },
      {
        headers: {
          "xi-api-key": key,
        },
      }
    );
    const contentType = response.headers.get("content-type");
    const isJson =
      !!contentType && contentType.indexOf("application/json") !== -1;
    if (isJson) {
      log.error("Error getting voice audio", await response.json());
      throw new APIError("bad_param", "Couldn't get voice audio");
    }

    // Upload to cloud storage.
    const filename = `voices/${hash}.mp3`;
    await uploadToBucket(
      "biomes-static",
      filename,
      Buffer.from(await response.arrayBuffer())
    );
    const url = `https://static.biomes.gg/${filename}`;

    // Save to cache.
    await db.collection("voices-cache").doc(hash).set({
      text,
      voice,
      url,
    });

    // Return URL.
    return { url };
  }
);
