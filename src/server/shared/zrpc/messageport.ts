import type { MessagePortLike } from "@/shared/zrpc/messageport";
import type { MessagePort } from "node:worker_threads";

export function nodeMessagePort(mp: MessagePort): MessagePortLike {
  return mp;
}
