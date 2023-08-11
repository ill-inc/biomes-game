import type { AssetServer } from "@/galois/server/interface";
import { LazyAssetServer } from "@/galois/server/lazy";
import { PoolAssetServer } from "@/galois/server/server";
import { registerInferenceRules } from "@/server/bikkie/inference";
import type { BikkieServer } from "@/server/bikkie/server";
import { registerBikkieServer } from "@/server/bikkie/server";
import type { AnyInferenceRule } from "@/server/shared/bikkie/bakery";
import type { BiomesBakery } from "@/server/shared/bikkie/registry";
import { registerBakery } from "@/server/shared/bikkie/registry";
import type { SharedServerContext } from "@/server/shared/context";
import { sharedServerContext } from "@/server/shared/context";
import { numCpus } from "@/server/shared/cpu";
import { BikkieAssetUpdater } from "@/server/shared/drive/bikkie_asset_updater";
import { AssetDrive } from "@/server/shared/drive/google";
import { AssetMirror } from "@/server/shared/drive/mirror";
import {
  registerIdGenerator,
  type IdGenerator,
} from "@/server/shared/ids/generator";
import { runServer } from "@/server/shared/main";
import type { WorldApi } from "@/server/shared/world/api";
import { registerWorldApi } from "@/server/shared/world/register";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { RegistryBuilder } from "@/shared/registry";

export interface BikkieServerContext extends SharedServerContext {
  assetServer: AssetServer;
  bakery: BiomesBakery;
  bikkieAssetUpdater?: BikkieAssetUpdater;
  bikkieInferenceRules: AnyInferenceRule[];
  idGenerator: IdGenerator;
  mirror?: AssetMirror; // Undefined for local development
  server: BikkieServer;
  worldApi: WorldApi;
}

async function registerMirror<C extends BikkieServerContext>(
  loader: RegistryLoader<C>
) {
  if (process.env.NODE_ENV === "production" || process.env.MIRROR_ASSETS) {
    // Google Drive access is not configured by default for local dev, only
    // run the mirror service in production.
    return AssetMirror.create(
      await loader.get("db"),
      await AssetDrive.create()
    );
  }
}

export async function registerBikkieAssetUpdater<C extends BikkieServerContext>(
  loader: RegistryLoader<C>
) {
  if (process.env.NODE_ENV === "production" || process.env.UPDATE_ASSETS) {
    const [db, bikkieNotifiers, bakery] = await Promise.all([
      loader.get("db"),
      loader.get("bikkieNotifiers"),
      loader.get("bakery"),
    ]);
    return new BikkieAssetUpdater(db, bakery, bikkieNotifiers.baking);
  }
}

async function registerAssetServer<C extends BikkieServerContext>(
  _loader: RegistryLoader<C>
) {
  const targetCpus = process.env.NODE_ENV === "production" ? numCpus() - 1 : 1;
  const createFn = () =>
    new PoolAssetServer("./src/galois/", "./data", Math.max(1, targetCpus));
  if (process.env.NODE_ENV === "production") {
    return createFn();
  }
  return new LazyAssetServer(() => {
    log.warn("Initializing local asset server! Python better be ready....");
    return createFn();
  });
}

void runServer(
  "bikkie",
  (signal) =>
    new RegistryBuilder<BikkieServerContext>()
      .install(sharedServerContext)
      .bind("assetServer", registerAssetServer)
      .bind("bakery", registerBakery)
      .bind("bikkieAssetUpdater", registerBikkieAssetUpdater)
      .bind("bikkieInferenceRules", registerInferenceRules)
      .bind("idGenerator", registerIdGenerator)
      .bind("mirror", registerMirror)
      .bind("server", registerBikkieServer)
      .bind("worldApi", registerWorldApi({ signal }))
      .build(),
  async (context) => {
    if (process.env.NODE_ENV === "production") {
      // In production bake biscuits on startup, dev can wait.
      await context.server.bake();
    }
  }
);
