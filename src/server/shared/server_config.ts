import { parseArgs, stringLiteralCtor } from "@/server/shared/args";
import type { BiscuitMode } from "@/server/shared/bikkie/storage/register";
import type { ChatApiMode } from "@/server/shared/chat/register";
import type { FirehoseMode } from "@/server/shared/firehose/register";
import type { StorageMode } from "@/server/shared/storage";
import type { WorldApiMode } from "@/server/shared/world/register";
import type { ArgumentConfig } from "ts-command-line-args";

export type CacheMode = "none" | "local" | "redis";

export interface BaseServerConfig {
  copyOnWriteSnapshot: string;
  storageMode: StorageMode;
  firehoseMode: FirehoseMode;
  biscuitMode: BiscuitMode;
  chatApiMode: ChatApiMode;
  worldApiMode: WorldApiMode;
  bikkieCacheMode: CacheMode;
  serverCacheMode: CacheMode;
}

export const baseServerArgumentConfig: ArgumentConfig<BaseServerConfig> = {
  storageMode: {
    type: stringLiteralCtor(
      "copy-on-write",
      "firestore",
      "memory",
      "snapshot",
      "shim"
    ),
    defaultValue: "copy-on-write",
    alias: "s",
  },
  firehoseMode: {
    type: stringLiteralCtor("memory", "shim", "redis"),
    defaultValue: "memory",
  },
  biscuitMode: {
    type: stringLiteralCtor("memory", "shim", "redis2"),
    defaultValue: "memory",
  },
  chatApiMode: {
    type: stringLiteralCtor("shim", "redis"),
    defaultValue: "shim",
  },
  copyOnWriteSnapshot: {
    type: String,
    defaultValue: "",
  },
  worldApiMode: {
    type: stringLiteralCtor("shim", "redis", "hfc-hybrid"),
    defaultValue: "shim",
  },
  bikkieCacheMode: {
    type: stringLiteralCtor("local", "redis"),
    defaultValue: "local",
  },
  serverCacheMode: {
    type: stringLiteralCtor("local", "redis"),
    defaultValue: "local",
  },
} as const;

export async function registerBaseServerConfig(): Promise<BaseServerConfig> {
  return parseArgs<BaseServerConfig>(baseServerArgumentConfig);
}
