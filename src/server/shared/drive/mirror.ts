import { GcsBinaryStore } from "@/server/shared/bikkie/binary";
import type { AssetDrive } from "@/server/shared/drive/google";
import type { BDB } from "@/server/shared/storage";
import type { MirroredAsset } from "@/shared/drive/types";
import { fullPath, originStringForAsset } from "@/shared/drive/types";
import { log } from "@/shared/logging";
import { DefaultMap, chunk } from "@/shared/util/collections";

export async function fetchAssetInfo(
  db: BDB,
  id: string
): Promise<MirroredAsset | undefined> {
  return (await db.collection("mirrored-assets").doc(id).get()).data();
}

export async function setAssetInfo(db: BDB, asset: MirroredAsset) {
  return db.collection("mirrored-assets").doc(asset.id).set(asset);
}

export async function getAllAssets(db: BDB) {
  const latestById = new Map<string, MirroredAsset>();
  for (const doc of (await db.collection("mirrored-assets").get()).docs) {
    const asset = doc.data();
    const existing = latestById.get(asset.id);
    if (!existing || existing.modifiedAtMs < asset.modifiedAtMs) {
      latestById.set(asset.id, asset);
    }
  }
  return Array.from(latestById.values());
}

export async function getLatestAssetsByPath(
  db: BDB
): Promise<Map<string, MirroredAsset>> {
  const latestByPath = new Map<string, MirroredAsset>();
  for (const asset of await getAllAssets(db)) {
    const path = fullPath(asset);
    if (!path) {
      continue;
    }
    const existing = latestByPath.get(path);
    if (!existing || existing.modifiedAtMs < asset.modifiedAtMs) {
      latestByPath.set(path, asset);
    }
  }
  return latestByPath;
}

export class AssetMirror {
  private readonly gcs = new GcsBinaryStore();

  private constructor(
    private readonly db: BDB,
    private readonly drive: AssetDrive,
    private readonly lastModifiedMs: DefaultMap<string, number>
  ) {}

  static async create(db: BDB, drive: AssetDrive) {
    const lastModifiedMs = new DefaultMap<string, number>(() => 0);
    for (const asset of await getAllAssets(db)) {
      lastModifiedMs.set(asset.id, asset.modifiedAtMs);
    }
    return new AssetMirror(db, drive, lastModifiedMs);
  }

  async run() {
    const assets = (await this.drive.listAssets()).filter(
      (asset) =>
        asset.modifiedAtMs > this.lastModifiedMs.get(asset.id) &&
        asset.size > 0 &&
        asset.size < CONFIG.bikkieMirrorMaxAssetSize
    );
    if (assets.length === 0) {
      return;
    }
    log.info(`Checking ${assets.length} assets for updates...`);
    let updated = 0;
    for (const batch of chunk(assets, CONFIG.bikkieMirrorBatchSize)) {
      const existing = await Promise.all(
        batch.map((asset) => fetchAssetInfo(this.db, asset.id))
      );
      const missing = batch.filter((asset, i) => {
        const found = existing[i];
        return (
          !found || !found.mirrored || found.modifiedAtMs !== asset.modifiedAtMs
        );
      });
      if (missing.length === 0) {
        continue;
      }
      const results = await Promise.allSettled(
        missing.map(async (asset) => {
          const origin = originStringForAsset(asset);
          log.info(`Mirroring asset content: ${origin}`, { asset });
          asset.mirrored = await this.gcs.store(
            originStringForAsset(asset),
            await this.drive.fetch(asset),
            asset.mime
          );
          // Metadata changed, update stored metadata for the asset.
          await setAssetInfo(this.db, asset as MirroredAsset);
          log.info("Updated asset", {
            origin: asset.mirrored.origin,
            hash: asset.mirrored.hash,
          });
          this.lastModifiedMs.set(asset.id, asset.modifiedAtMs);
        })
      );
      for (const result of results) {
        if (result.status !== "rejected") {
          updated++;
          continue;
        }
        log.error("Failed to mirror asset", { error: result.reason });
      }
    }
    if (updated > 0) {
      log.info(`Updated ${updated} assets`);
    }
  }
}
