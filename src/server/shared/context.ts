import type { BikkieRefresher } from "@/server/shared/bikkie/bikkie_refresher";
import { registerBikkieRefresher } from "@/server/shared/bikkie/bikkie_refresher";
import type { BikkieStorage } from "@/server/shared/bikkie/storage/api";
import { registerBikkieStorage } from "@/server/shared/bikkie/storage/register";
import type { Notifier } from "@/server/shared/distributed_notifier/api";
import { createDistributedNotifier } from "@/server/shared/distributed_notifier/notifier";
import type { BaseServerConfig } from "@/server/shared/server_config";
import { registerBaseServerConfig } from "@/server/shared/server_config";
import type { BDB } from "@/server/shared/storage";
import { registerBiomesStorage } from "@/server/shared/storage";
import type { RegistryBuilder } from "@/shared/registry";

export class BikkieNotifiers {
  constructor(
    public readonly baking: Notifier,
    public readonly tray: Notifier
  ) {}

  async stop() {
    await Promise.all([this.baking.stop(), this.tray.stop()]);
  }
}

export interface SharedServerContext {
  config: BaseServerConfig;
  bikkieNotifiers: BikkieNotifiers;
  bikkieStorage: BikkieStorage;
  bikkieRefresher: BikkieRefresher;
  db: BDB;
}

export function sharedServerContext<C extends SharedServerContext>(
  builder: RegistryBuilder<C>
) {
  return builder
    .bind(
      "bikkieNotifiers",
      async () =>
        new BikkieNotifiers(
          createDistributedNotifier("bikkie-baking-needed"),
          createDistributedNotifier("bikkie")
        )
    )
    .bind("bikkieRefresher", registerBikkieRefresher)
    .loadEarly("bikkieRefresher")
    .bind("bikkieStorage", registerBikkieStorage)
    .bind("config", registerBaseServerConfig)
    .bind("db", registerBiomesStorage);
}
