import {
  registerNotificationsServer,
  type NotificationsServer,
} from "@/server/notify/server";
import type { ChatApi } from "@/server/shared/chat/api";
import { registerChatApi } from "@/server/shared/chat/register";
import type { SharedServerContext } from "@/server/shared/context";
import { sharedServerContext } from "@/server/shared/context";
import type { Firehose } from "@/server/shared/firehose/api";
import { registerFirehose } from "@/server/shared/firehose/register";
import { runServer } from "@/server/shared/main";
import type { WorldApi } from "@/server/shared/world/api";
import { registerWorldApi } from "@/server/shared/world/register";
import { RegistryBuilder } from "@/shared/registry";

export interface NotificationsServerContext extends SharedServerContext {
  chatApi: ChatApi;
  firehose: Firehose;
  server: NotificationsServer;
  worldApi: WorldApi;
}

void runServer(
  "notify",
  (signal) =>
    new RegistryBuilder<NotificationsServerContext>()
      .install(sharedServerContext)
      .bind("chatApi", registerChatApi)
      .bind("firehose", registerFirehose)
      .bind("server", registerNotificationsServer)
      .bind("worldApi", registerWorldApi({ signal }))
      .build(),
  async (context) => {
    await context.server.start();
  }
);
