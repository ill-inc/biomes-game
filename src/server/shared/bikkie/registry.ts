import { BACKUP_BIKKIE_TRAY_ID } from "@/server/backup/serde";
import type {
  AnyInferenceRule,
  BakeOptions,
} from "@/server/shared/bikkie/bakery";
import { Bakery } from "@/server/shared/bikkie/bakery";
import type { BikkieCache } from "@/server/shared/bikkie/cache";
import { BikkieRedisCache } from "@/server/shared/bikkie/cache";
import type { BikkieStorage } from "@/server/shared/bikkie/storage/api";
import type { IdGenerator } from "@/server/shared/ids/generator";
import { connectToRedis } from "@/server/shared/redis/connection";
import type { BaseServerConfig } from "@/server/shared/server_config";
import type { BDB } from "@/server/shared/storage";
import type { Biscuit } from "@/shared/bikkie/schema/attributes";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type { bikkie } from "@/shared/bikkie/schema/biomes";
import type { BiomesId } from "@/shared/ids";
import type { RegistryLoader } from "@/shared/registry";

// Bit of type gymnastics to use our manually specified type to make callers
// cleaner.
export type BiomesBakeOptions = Omit<BakeOptions<typeof bikkie>, "prior"> & {
  prior?: BakedBiscuitTray;
};

export type BiomesBakery = Omit<
  Bakery<typeof bikkie>,
  "bakeActiveTray" | "bakeTray"
> & {
  bakeActiveTray: (options?: BiomesBakeOptions) => Promise<BakedBiscuitTray>;
  bakeTray: (
    id?: BiomesId,
    options?: BiomesBakeOptions
  ) => Promise<BakedBiscuitTray>;
};

export interface BakedBiscuitTray {
  id: BiomesId;
  contents: Map<BiomesId, Biscuit>;
  hashes: Map<BiomesId, string>;
}

export function createBiomesBakery(
  db: BDB,
  storage: BikkieStorage,
  inferenceRules: AnyInferenceRule[],
  idGenerator?: IdGenerator | undefined,
  cache?: BikkieCache | undefined
) {
  return new Bakery(attribs, inferenceRules, db, storage, idGenerator, {
    cache,
    // Fallback to the backup default try with the assumption that if the db
    // is empty, then we're loading bikkie tray data from a backup.
    defaultTrayId: BACKUP_BIKKIE_TRAY_ID,
  }) as unknown as BiomesBakery;
}

export async function registerBakery<
  C extends {
    db: BDB;
    bikkieStorage: BikkieStorage;
    idGenerator?: IdGenerator;
    config: BaseServerConfig;
    bikkieInferenceRules?: AnyInferenceRule[];
  }
>(loader: RegistryLoader<C>) {
  const [db, bikkieStorage, rules, config, idGenerator] = await Promise.all([
    loader.get("db"),
    loader.get("bikkieStorage"),
    loader.getOptional("bikkieInferenceRules"),
    loader.get("config"),
    loader.getOptional("idGenerator"),
  ]);
  return createBiomesBakery(
    db,
    bikkieStorage,
    rules ?? [],
    idGenerator,
    config.bikkieCacheMode === "redis"
      ? new BikkieRedisCache(await connectToRedis("bikkie-cache"))
      : undefined
  );
}
