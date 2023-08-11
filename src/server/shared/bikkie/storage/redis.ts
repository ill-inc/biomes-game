import type { BakedBiscuitTray } from "@/server/shared/bikkie/registry";
import type { BikkieStorage } from "@/server/shared/bikkie/storage/api";
import {
  emptyBakedTray,
  fromStoredBiscuit,
  toStoredBiscuit,
  zStoredBakedBiscuit,
  zStoredBiscuit,
} from "@/server/shared/bikkie/storage/baked";
import { parseEncodedTrayDefinition } from "@/server/shared/bikkie/storage/definition";
import type { BiomesRedis } from "@/server/shared/redis/connection";
import type { BiscuitTray } from "@/shared/bikkie/tray";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { fireAndForget } from "@/shared/util/async";
import { zrpcDeserialize, zrpcSerialize } from "@/shared/zrpc/serde";
import { chunk } from "lodash";

const BAKED_TRAY_ID_KEY = Buffer.from("baked-id");

export class RedisBikkieStorage implements BikkieStorage {
  constructor(private readonly redis: BiomesRedis) {}

  async saveDefinition(tray: BiscuitTray) {
    await this.redis.primary.set(`definition:${tray.id}`, zrpcSerialize(tray));
  }

  async loadDefinition(id: BiomesId): Promise<BiscuitTray | undefined> {
    const raw = await this.redis.primary.getBuffer(`definition:${id}`);
    return parseEncodedTrayDefinition(id, raw, this.loadDefinition.bind(this));
  }

  private async getCurrentBakedTrayId(): Promise<BiomesId | undefined> {
    const rawTrayId = await this.redis.primary.get(BAKED_TRAY_ID_KEY);
    if (rawTrayId) {
      return parseBiomesId(rawTrayId);
    }
  }

  private async expireBakedTray(id: BiomesId) {
    for await (const keys of this.redis.primary.scanBufferStream({
      match: `baked:${id}:*`,
    })) {
      if (keys.length === 0) {
        continue;
      }
      const multi = this.redis.primary.multi();
      for (const key of keys) {
        multi.expire(key, CONFIG.bikkieStorageTrayExpirySecs);
      }
      await multi.exec();
    }
  }

  async save(tray: BakedBiscuitTray) {
    const priorId = await this.getCurrentBakedTrayId();
    for (const batch of chunk(
      [...tray.contents],
      CONFIG.bikkieStorageSaveBatchSize
    )) {
      const multi = this.redis.primary.multi();
      for (const [id, biscuit] of batch) {
        const key = `baked:${tray.id}:${id}`;
        const stored = zrpcSerialize(toStoredBiscuit(biscuit));
        multi.set(key, zrpcSerialize([id, tray.hashes.get(id)!, stored]));
      }
      await multi.exec();
    }
    await this.redis.primary.set(BAKED_TRAY_ID_KEY, `b:${tray.id}`);
    if (priorId && priorId !== tray.id) {
      fireAndForget(this.expireBakedTray(priorId));
    }
  }

  async load(prior?: BakedBiscuitTray): Promise<BakedBiscuitTray> {
    const trayId = await this.getCurrentBakedTrayId();
    if (!trayId) {
      return emptyBakedTray();
    }
    if (prior?.id === trayId) {
      return prior;
    }
    const tray: BakedBiscuitTray = {
      id: trayId,
      contents: new Map(),
      hashes: new Map(),
    };
    for await (const keys of this.redis.primary.scanBufferStream({
      match: `baked:${tray.id}:*`,
    })) {
      if (keys.length === 0) {
        continue;
      }
      const stored = await this.redis.primary.mgetBuffer(keys);
      for (const encoded of stored) {
        if (!encoded) {
          continue;
        }
        try {
          const [id, hash, encodedBiscuit] = zrpcDeserialize(
            encoded,
            zStoredBakedBiscuit
          );
          const priorHash = prior?.hashes.get(id);
          if (priorHash === hash) {
            tray.hashes.set(id, hash);
            tray.contents.set(id, prior!.contents.get(id)!);
          } else {
            const biscuit = fromStoredBiscuit(
              zrpcDeserialize(encodedBiscuit, zStoredBiscuit)
            );
            tray.hashes.set(id, hash);
            tray.contents.set(id, biscuit);
          }
        } catch (error) {
          log.warn("Could not decode stored baked biscuit, ignoring", {
            error,
          });
        }
      }
    }
    return tray;
  }

  async stop() {
    await this.redis.quit("RedisBikkieStorage stopping");
  }
}
