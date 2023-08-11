import { zSendMessageRequest } from "@/server/shared/chat/api";
import { biomesApiHandler } from "@/server/web/util/api_middleware";
import { z } from "zod";

export const zAdminSendMessageBody = z.object({
  request: zSendMessageRequest,
});

export type AdminSendMessageBody = z.infer<typeof zAdminSendMessageBody>;

export default biomesApiHandler(
  {
    auth: "admin",
    body: zAdminSendMessageBody,
  },
  async ({ context: { chatApi }, body: { request } }) => {
    await chatApi.sendMessage(request);
  }
);
