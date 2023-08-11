import type { ShardManagerDomain } from "@/server/shared/shard_manager/api";

export type DistributedNotifierKey =
  | "bikkie"
  | "bikkie-baking-needed"
  | `shard-manager:${ShardManagerDomain}`;

export function isShardManagerNotifierKey(
  key: DistributedNotifierKey
): key is `shard-manager:${ShardManagerDomain}` {
  return key.startsWith("shard-manager:");
}

// Watches for changes to the active tray.
export interface Notifier<T extends string = string> {
  stop(): Promise<void>;
  notify(value: T): Promise<void>;
  fetch(): Promise<T | undefined>;
  on(event: "change", listener: (value: T) => void): void;
  off(event: "change", listener: (value: T) => void): void;
}

export type NotifierEvents<T extends string = string> = {
  change: (value: T) => void;
};
