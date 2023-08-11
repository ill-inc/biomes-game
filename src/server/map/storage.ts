import type { MapContext } from "@/server/map/context";
import { fetchTileIndex, writeTileIndex } from "@/server/shared/map/indices";
import type { BDB } from "@/server/shared/storage";
import {
  downloadFromBucketViaStreaming,
  uploadToBucket,
} from "@/server/web/cloud_storage/cloud_storage";
import { LightTrace } from "@/shared/light_trace";
import { log } from "@/shared/logging";
import { tilePathFromKey } from "@/shared/map/paths";
import { decodeTileMap, encodeTileMap } from "@/shared/map/serde";
import type { TileKey } from "@/shared/map/types";
import type { RegistryLoader } from "@/shared/registry";
import type { CloudBucketKey } from "@/shared/url_types";
import { chunk } from "@/shared/util/collections";
import { EventThrottle } from "@/shared/util/throttling";
import { crc32 } from "crc";

const BUCKET: CloudBucketKey = "biomes-static";

class Index {
  private map = new Map<TileKey, string>();
  constructor(private name: string) {}

  async load(db: BDB) {
    try {
      const index = await fetchTileIndex(db, this.name);
      if (index) {
        this.map = await decodeTileMap(index.blob);
      }
    } catch (error) {
      log.error(`Failed to fetch tile index`, { error });
    }
  }

  async save(db: BDB) {
    const blob = await encodeTileMap(this.map);
    return writeTileIndex(db, this.name, { blob });
  }

  set(key: TileKey, val: string) {
    this.map.set(key, val);
  }

  get(key: TileKey) {
    return this.map.get(key);
  }
}

interface Commit {
  data: Buffer;
  fingerprint: string;
}

export class MapStore {
  private throttle = new EventThrottle(CONFIG.mapTileFlushPeriodMs);
  private buffer = new Map<TileKey, Commit>();
  private versions = new Index("versions");
  private fingerprints = new Index("fingerprints");

  constructor(readonly db: BDB) {}

  private *drainBuffer(count: number) {
    let i = 0;
    for (const [key, val] of this.buffer.entries()) {
      if (i >= count) {
        return;
      }
      this.buffer.delete(key);
      yield [key, val] as const;
      i += 1;
    }
  }

  private versionIsStale(name: TileKey) {
    return this.age(name) > CONFIG.mapTileStalenessThresholdMs;
  }

  async start() {
    // Load the indices of file versions and fingerprints.
    await this.versions.load(this.db);
    await this.fingerprints.load(this.db);
  }

  async flush() {
    if (!this.throttle.testAndSet()) {
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);

    log.info(`Updating ${this.buffer.size} tiles with version ${timestamp}...`);
    const trace = new LightTrace();

    // Write all new files.
    const updates = Array.from(this.drainBuffer(CONFIG.mapTileFlushSize));
    for (const batch of chunk(updates, CONFIG.mapTileFlushConcurrency)) {
      const promises: Promise<void>[] = [];
      for (const [name, { data, fingerprint }] of batch) {
        promises.push(
          uploadToBucket(BUCKET, tilePathFromKey(name), data).then(() => {
            this.versions.set(name, `${timestamp}`);
            this.fingerprints.set(name, fingerprint);
          })
        );
      }
      await Promise.all(promises);
    }
    trace.mark("tiles");
    await this.versions.save(this.db);
    trace.mark("versions");
    await this.fingerprints.save(this.db);
    trace.mark("fingerprints");
    log.info(`Finished writing ${updates.length} tiles. ${trace}`);
  }

  age(name: TileKey) {
    const version = this.versions.get(name);
    return Date.now() - 1000 * parseInt(version ?? "0");
  }

  exists(name: TileKey) {
    return !!this.versions.get(name);
  }

  read(name: TileKey) {
    return downloadFromBucketViaStreaming(BUCKET, tilePathFromKey(name));
  }

  write(name: TileKey, data: Uint8Array) {
    const fingerprint = crc32(data).toString(16);
    if (
      this.versionIsStale(name) ||
      this.fingerprints.get(name) != fingerprint
    ) {
      this.buffer.set(name, {
        data: Buffer.from(data.buffer, data.byteOffset, data.byteLength),
        fingerprint,
      });
    }
  }
}

export async function registerStore<C extends MapContext>(
  loader: RegistryLoader<C>
) {
  return new MapStore(await loader.get("db"));
}
