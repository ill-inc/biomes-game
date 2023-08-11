import type { ChatMessage } from "@/shared/chat/messages";
import { zChatMessage } from "@/shared/chat/messages";
import { zVec3f } from "@/shared/ecs/gen/types";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zMessageVolume = z.enum(["whisper", "chat", "yell"]);

export type MessageVolume = z.infer<typeof zMessageVolume>;

export const zSpatial = z.object({
  position: zVec3f.optional(),
  volume: zMessageVolume,
});

export const zEnvelope = z.object({
  id: z.string(),
  createdAt: z.number(),
  localTime: z.number().optional(),
  from: zBiomesId.optional(),
  to: zBiomesId.optional(),
  spatial: zSpatial.optional(),
  message: zChatMessage,
});

export type Envelope = z.infer<typeof zEnvelope>;

export const zUnsendEnvelope = zEnvelope.pick({
  from: true,
  to: true,
  message: true,
});

export type UnsendEnvelope = z.infer<typeof zUnsendEnvelope>;

export const zChannelName = z.enum(["dm", "chat", "activity"]);

export const ALL_CHANNEL_NAMES = zChannelName.options;

export type ChannelName = z.infer<typeof zChannelName>;

export const zDelivery = z.object({
  channelName: zChannelName,
  mail: z.array(zEnvelope).optional(),
  unsend: z.array(zUnsendEnvelope).optional(),
});

export type Delivery = z.infer<typeof zDelivery>;

export const USER_INITIATED_MESSAGE_TYPES = new Set<ChatMessage["kind"]>([
  "text",
  "emote",
  "photo",
  "group_create",
  "typing",
  "warp",
  "death",
  "follow",
  "like",
  "catch",
  "minigame_join",
]);
