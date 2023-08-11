import type { BakedBiscuitTray } from "@/server/shared/bikkie/registry";
import type { BikkieStorage } from "@/server/shared/bikkie/storage/api";
import type { Notifier } from "@/server/shared/distributed_notifier/api";
import type { WorldApi } from "@/server/shared/world/api";
import { BikkieRuntime } from "@/shared/bikkie/active";
import { WorldMetadataId } from "@/shared/ecs/ids";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";

export class BikkieRefresher {
  private pendingRefresh = false;
  private inflightRefresh: Promise<unknown> = Promise.resolve();
  private prior: BakedBiscuitTray | undefined;

  constructor(
    private readonly notifier: Notifier,
    private readonly runtime: BikkieRuntime,
    private readonly storage: BikkieStorage,
    private readonly worldApi?: WorldApi
  ) {
    this.notifier.on("change", (trayId: string) => {
      if (String(this.prior?.id) === trayId) {
        return;
      }
      if (this.pendingRefresh) {
        // One already scheduled.
        return;
      }
      if (process.env.DISABLE_BIKKIE_REFRESH === "1") {
        return;
      }
      this.pendingRefresh = true;
      this.inflightRefresh = this.inflightRefresh
        .then(async () => {
          this.pendingRefresh = false;
          await this.force();
        })
        .catch((error) => log.error("Error refreshing biscuits", { error }));
    });
  }

  async currentTray() {
    if (!this.prior) {
      await this.force();
    }
    return this.prior!;
  }

  async force() {
    const baked = await this.storage.load(this.prior);
    this.runtime.registerBiscuits(baked.contents);
    this.prior = baked;
    return baked;
  }

  private async notifyViaEcs(trayId: BiomesId) {
    if (!this.worldApi) {
      return;
    }
    await this.worldApi.apply({
      changes: [
        {
          kind: "update",
          entity: {
            id: WorldMetadataId,
            active_tray: { id: trayId },
          },
        },
      ],
    });
  }

  async notifyRefreshNeeded(trayId: BiomesId) {
    await Promise.all([
      this.notifier.notify(String(trayId)),
      this.notifyViaEcs(trayId),
    ]);
  }
}

export async function registerBikkieRefresher<
  C extends {
    bikkieNotifiers: { tray: Notifier };
    bikkieStorage: BikkieStorage;
    worldApi?: WorldApi;
  }
>(loader: RegistryLoader<C>) {
  const [bikkieNotifiers, storage, worldApi] = await Promise.all([
    loader.get("bikkieNotifiers"),
    loader.get("bikkieStorage"),
    loader.getOptional("worldApi"),
  ]);
  const refresher = new BikkieRefresher(
    bikkieNotifiers.tray,
    BikkieRuntime.get(),
    storage,
    worldApi
  );
  await refresher.force();
  return refresher;
}
