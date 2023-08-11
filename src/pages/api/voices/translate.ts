import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { google } from "googleapis";
import { first } from "lodash";
import { hash as md5 } from "spark-md5";
import { z } from "zod";

export const zTranslateRequest = z.object({
  original: z.string(),
  language: z.string(),
});

export type TranslateRequest = z.infer<typeof zTranslateRequest>;

export const zTranslateResponse = z.object({
  translated: z.string().optional(),
});

export type TranslateResponse = z.infer<typeof zTranslateResponse>;

function hashTranslateRequest(request: TranslateRequest): string {
  return md5(`${request.language}:${request.original}`);
}

export default biomesApiHandler(
  {
    auth: "required",
    body: zTranslateRequest,
    response: zTranslateResponse,
  },
  async ({ context: { db }, body: { original, language } }) => {
    // Check cache.
    const hash = hashTranslateRequest({ original, language });
    const doc = await db.collection("translations").doc(hash).get();
    if (doc.exists) {
      // Return cached URL.
      return { translated: doc.data()!.translated };
    }

    const service = google.translate({
      version: "v3beta1",
      auth: new google.auth.GoogleAuth({
        scopes: [
          "https://www.googleapis.com/auth/cloud-platform",
          "https://www.googleapis.com/auth/cloud-translation",
        ],
      }),
    });
    const response = await service.projects.translateText({
      parent: "projects/zones-cloud",
      requestBody: {
        contents: [original],
        mimeType: "text/plain",
        sourceLanguageCode: "en",
        targetLanguageCode: language,
      },
    });
    const translated =
      first(response.data.translations)?.translatedText ?? undefined;

    // Save to cache.
    if (translated) {
      await db.collection("translations").doc(hash).set({
        original,
        language,
        translated,
      });
    }

    // Return translated text.
    return { translated };
  }
);
