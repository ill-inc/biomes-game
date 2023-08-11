import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { zRobotVisitorMessage } from "@/shared/chat/messages";
import { zBiomesId } from "@/shared/ids";
import { z } from "zod";

export const zRobotVisitorMessageRequest = z.object({
  to: zBiomesId,
  message: zRobotVisitorMessage.omit({ kind: true }),
});

export type RobotVisitorMessageRequest = z.infer<
  typeof zRobotVisitorMessageRequest
>;

export default biomesApiHandler(
  {
    auth: "required",
    body: zRobotVisitorMessageRequest,
  },
  async ({ context, auth: { userId }, body: { to, message } }) => {
    const { chatApi } = context;
    const rateLimitingTimestamp = Math.floor(Date.now() / (1000 * 60 * 60));

    await chatApi.sendMessage({
      id: `visit:${message.robotId}:${rateLimitingTimestamp}`,
      channel: "activity",
      to,
      from: userId,
      message: {
        kind: "robotVisitorMessage",
        ...message,
      },
    });
  }
);
