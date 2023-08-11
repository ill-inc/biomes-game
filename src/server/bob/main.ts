import type { BobTheBuilder } from "@/server/bob/server";
import { registerBobTheBuilder } from "@/server/bob/server";
import { parseArgs, stringLiteralCtor } from "@/server/shared/args";
import { runServer } from "@/server/shared/main";
import type { BDB, StorageMode } from "@/server/shared/storage";
import { registerBiomesStorage } from "@/server/shared/storage";
import { RegistryBuilder } from "@/shared/registry";
import { ok } from "assert";
import type { ArgumentConfig } from "ts-command-line-args";

export interface BobServerConfig {
  workspace: string;
  copyOnWriteSnapshot: string;
  storageMode: StorageMode;
}

export const bobServerArgumentConfig: ArgumentConfig<BobServerConfig> = {
  workspace: {
    type: String,
    defaultValue: "",
  },
  copyOnWriteSnapshot: {
    type: String,
    defaultValue: "",
  },
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
} as const;

export async function registerBobServerConfig(): Promise<BobServerConfig> {
  return parseArgs<BobServerConfig>(bobServerArgumentConfig);
}

export interface BobServerContext {
  config: BobServerConfig;
  gracefulShutdown: () => void;
  server: BobTheBuilder;
  db: BDB;
}

void runServer(
  "bob",
  (_, gracefulShutdown) =>
    new RegistryBuilder<BobServerContext>()
      .set("gracefulShutdown", gracefulShutdown)
      .bind("config", registerBobServerConfig)
      .bind("server", registerBobTheBuilder)
      .bind("db", registerBiomesStorage)
      .build(),
  async (context) => {
    ok(context.config.workspace, "Workspace must be specified");
    await context.server.start();
  }
);
