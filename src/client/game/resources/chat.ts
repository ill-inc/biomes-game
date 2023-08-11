import type { ClientContext } from "@/client/game/context";
import type { ClientResourcesBuilder } from "@/client/game/resources/types";
import type { Envelope } from "@/shared/chat/types";
import type { RegistryLoader } from "@/shared/registry";

export type ChatMessages = {
  messages: Envelope[];
};

export type ProgressMessage = {
  id: number;
  status: "success" | "error" | "progress";
  body: string;
  onClick?: () => unknown;
};
export type ProgressMessages = {
  messages: ProgressMessage[];
};

export function addChatResources(
  _loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addGlobal("/activity", {
    messages: [],
  });
  builder.addGlobal("/activity/unread", {
    messages: [],
  });
  builder.addGlobal("/activity/popup", {
    messages: [],
  });
  builder.addGlobal("/activity/progress", {
    messages: [],
  });
  builder.addGlobal("/chat", { messages: [] });
  builder.addGlobal("/dms", { messages: [] });
}
