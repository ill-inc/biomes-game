import type { ChatMessage } from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import { messageFromError, randomString } from "@/shared/util/helpers";

export function envelopeForChatError(
  error: any,
  senderId?: BiomesId
): Envelope {
  const now = Date.now();
  return {
    id: randomString(10),
    createdAt: now,
    localTime: now,
    from: senderId,
    message: {
      kind: "error",
      content: messageFromError(error).toString(),
    },
  };
}

export function envelopeForChatInfo(
  info: string,
  senderId?: BiomesId
): Envelope {
  const now = Date.now();
  return {
    id: randomString(10),
    createdAt: now,
    localTime: now,
    from: senderId,
    message: {
      kind: "text",
      content: info,
    },
  };
}

export function envelopeForLocalMessage(
  message: ChatMessage,
  senderId?: BiomesId,
  nonce?: string
): Envelope {
  const now = Date.now();
  return {
    id: nonce ?? randomString(10),
    createdAt: now,
    localTime: now,
    from: senderId,
    message,
  };
}
