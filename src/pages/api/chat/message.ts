import { okOrAPIError } from "@/server/web/errors";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zChatMessage } from "@/shared/chat/messages";
import {
  USER_INITIATED_MESSAGE_TYPES,
  zDelivery,
  zMessageVolume,
} from "@/shared/chat/types";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zSendMessageRequest = z.object({
  localTime: z.number(),
  volume: zMessageVolume,
  message: zChatMessage,
  to: zBiomesId.optional(),
});

export type SendMessageRequest = z.infer<typeof zSendMessageRequest>;

export const zSendMessageResponse = z.object({
  delivery: zDelivery.optional(),
});

export type SendMessageResponse = z.infer<typeof zSendMessageResponse>;

export default biomesApiHandler(
  {
    auth: "required",
    body: zSendMessageRequest,
    response: zSendMessageResponse,
  },
  async ({
    context: { chatApi },
    auth: { userId },
    body: { localTime, volume, message, to },
  }) => {
    okOrAPIError(USER_INITIATED_MESSAGE_TYPES.has(message.kind), "bad_param");
    const result = await chatApi.sendMessage({
      localTime,
      from: userId,
      spatial: {
        volume,
      },
      message,
      to,
    });
    return {
      delivery: result.echo,
    };
  }
);
