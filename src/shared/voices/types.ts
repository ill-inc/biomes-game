import { z } from "zod";

export const zChatVoice = z.object({
  text: z.string(),
  voice: z.string(),
  url: z.string(),
});

export type ChatVoice = z.infer<typeof zChatVoice>;

export const zTranslation = z.object({
  original: z.string(),
  translated: z.string(),
  language: z.string(),
});

export type Translation = z.infer<typeof zTranslation>;
