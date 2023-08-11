import type { BikkieServerContext } from "@/server/bikkie/main";
import type { BikkieRefresher } from "@/server/shared/bikkie/bikkie_refresher";
import type {
  BakedBiscuitTray,
  BiomesBakery,
} from "@/server/shared/bikkie/registry";
import type { BikkieStorage } from "@/server/shared/bikkie/storage/api";
import type { Notifier } from "@/server/shared/distributed_notifier/api";
import type { BikkieAssetUpdater } from "@/server/shared/drive/bikkie_asset_updater";
import type { AssetMirror } from "@/server/shared/drive/mirror";
import { BackgroundTaskController } from "@/shared/abort";
import {
  PUBLISHED_BINARY_ATTRIBUTES,
  attribs,
} from "@/shared/bikkie/schema/attributes";
import type { AnyBinaryAttribute } from "@/shared/bikkie/schema/binary";
import { isAnyBinaryAttribute } from "@/shared/bikkie/schema/binary";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import {
  PipelineBatcher,
  PromiseQueue,
  fireAndForget,
  sleep,
} from "@/shared/util/async";
import { isEqual } from "lodash";

// Listens for changes to active tray and then builds them and notifies clients
// it is available.
export class BikkieServer {
  private readonly controller = new BackgroundTaskController();

  private batcher = new PipelineBatcher(
    () => this.doBake(),
    30 * 1000,
    this.controller.signal
  );
  // Last baked tray by us.
  private lastBaked?: BiomesId;
  private prior?: BakedBiscuitTray;

  constructor(
    private readonly bakery: BiomesBakery,
    bikkieNotifiers: { baking: Notifier },
    private readonly storage: BikkieStorage,
    private readonly bikkieRefresher: BikkieRefresher,
    bikkieAssetUpdater?: BikkieAssetUpdater,
    mirror?: AssetMirror
  ) {
    bikkieNotifiers.baking.on("change", () => fireAndForget(this.bake()));

    this.controller.runInBackground("periodicallyBake", async (signal) => {
      while (await sleep(CONFIG.bikkieBakeCheckInterval, signal)) {
        const activeId = await this.bakery.getActiveTrayId();
        if (activeId !== this.lastBaked) {
          fireAndForget(this.bake());
        }
      }
    });
    if (bikkieAssetUpdater) {
      this.controller.runInBackground("updateAssets", async (signal) => {
        while (await sleep(CONFIG.bikkieUpdateAssetInterval, signal)) {
          try {
            await bikkieAssetUpdater.update();
          } catch (error) {
            log.error("Failed to update assets in Bikkie", { error });
          }
        }
      });
    }
    if (mirror) {
      this.controller.runInBackground("mirrorAssets", async (signal) => {
        while (await sleep(CONFIG.bikkieMirrorAssetInterval, signal)) {
          await mirror.run();
        }
      });
    }
  }

  private async publishAssetsAndCountChanged(
    prior: BakedBiscuitTray,
    baked: BakedBiscuitTray
  ) {
    let changed = 0;
    const queue = new PromiseQueue(CONFIG.bikkiePublishBinaryBatchSize);
    for (const [id, biscuit] of baked.contents) {
      if (baked.hashes.get(id) === prior.hashes.get(id)) {
        // No change.
        continue;
      }
      changed++;
      const priorBiscuit = prior.contents.get(id);
      for (const attributeName of PUBLISHED_BINARY_ATTRIBUTES) {
        const attribute = attribs[attributeName];
        if (!attribute) {
          log.error("Unknown attribute to publish", { attributeName });
          continue;
        }
        if (!isAnyBinaryAttribute(attribute.type())) {
          log.error("Invalid attribute to publish", { attribute });
          continue;
        }
        const value = biscuit[attributeName] as AnyBinaryAttribute;
        if (!value) {
          continue;
        }
        const priorValue = priorBiscuit?.[attributeName];
        if (isEqual(priorValue, value)) {
          continue;
        }
        await queue.push(() => this.bakery.binaries.publish(value));
      }
    }
    return changed;
  }

  private async doBake() {
    if (!this.prior) {
      this.prior = await this.storage.load();
    }
    log.info("Baking biscuits...", {
      priorTray: this.prior.id,
      prior: this.prior.contents.size,
    });
    const baked = await this.bakery.bakeActiveTray({ prior: this.prior });
    const changed = await this.publishAssetsAndCountChanged(this.prior, baked);
    await this.storage.save(baked);
    this.prior = baked;
    log.info("Baked Biscuits, published, saved into storage.", {
      tray: baked.id,
      changed,
      total: baked.contents.size,
    });
    this.lastBaked = baked.id;
    await this.bikkieRefresher.notifyRefreshNeeded(baked.id);
    log.info("Notified all clients of new tray", { tray: baked.id });
  }

  // Request baking of biscuits.
  async bake() {
    await this.batcher.invalidate();
  }
}

export async function registerBikkieServer<C extends BikkieServerContext>(
  loader: RegistryLoader<C>
) {
  const [
    bakery,
    bikkieNotifiers,
    storage,
    bikkieRefresher,
    bikkieAssetUpdater,
    mirror,
  ] = await Promise.all([
    loader.get("bakery"),
    loader.get("bikkieNotifiers"),
    loader.get("bikkieStorage"),
    loader.get("bikkieRefresher"),
    loader.getOptional("bikkieAssetUpdater"),
    loader.getOptional("mirror"),
  ]);
  return new BikkieServer(
    bakery,
    bikkieNotifiers,
    storage,
    bikkieRefresher,
    bikkieAssetUpdater,
    mirror
  );
}
