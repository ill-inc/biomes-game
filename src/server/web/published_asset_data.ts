import { resolveAssetUrlUntyped } from "@/galois/interface/asset_paths";
import assetVersions from "@/galois/interface/gen/asset_versions.json";
import * as cloud_storage from "@/server/web/cloud_storage/cloud_storage";
import { absoluteBucketURL } from "@/server/web/util/urls";
import { log } from "@/shared/logging";
import { mapAsyncPool } from "@/shared/util/async";
import { ok } from "assert";
import * as fs from "fs";
import fetch from "node-fetch";
import { dirname, join } from "path";
import * as stream from "stream";

const publicDir = "public";
const assetDataDir = join(publicDir, "asset_data");
const assetDataBucketName = "biomes-static";

function assetPathToLocalPath(x: string) {
  return join(publicDir, x);
}

export async function ensurePublishedAssetsAreLocal(): Promise<void> {
  if (isLocalAssetDataUpToDate()) {
    log.info("Static asset data is locally up-to-date, skipping GCS download.");
    return Promise.resolve();
  }

  log.info("Downloading static asset data from GCS...");

  // Clear out our local asset_data directory directory so that we can replace
  // it with contents from GCS.
  await fs.promises.rm(assetDataDir, { recursive: true, force: true });

  const downloadPromises = Object.values(assetVersions.paths).map(
    async (path) => {
      const destinationFilePath = assetPathToLocalPath(path);
      await fs.promises.mkdir(dirname(destinationFilePath), {
        recursive: true,
      });
      const assetUrl = absoluteBucketURL(assetDataBucketName, path);
      const response = await fetch(assetUrl);
      if (!response.ok) {
        throw new Error(
          `Error fetching asset data "${path}" from GCS (bucket "${assetDataBucketName}") via the URL: "${assetUrl}"`
        );
      }
      const dataWrite = response.body.pipe(
        fs.createWriteStream(destinationFilePath)
      );
      return stream.promises.finished(dataWrite);
    }
  );

  await Promise.all(downloadPromises);
  log.info("Done downloading asset data from GCS.");
}

export async function publish(
  path: string,
  data: Buffer | string,
  mimeType?: string
) {
  return cloud_storage.uploadToBucket(
    assetDataBucketName,
    path,
    data,
    mimeType
  );
}

export function isLocalAssetDataUpToDate() {
  return Object.values(assetVersions.paths).every((x) =>
    fs.existsSync(assetPathToLocalPath(x))
  );
}

async function isAssetPublished(
  path: string,
  retries: number = 0
): Promise<boolean> {
  const assetUrl = resolveAssetUrlUntyped(path);
  ok(assetUrl, `Could not resolve URL for path: ${path}`);
  try {
    const response = await fetch(assetUrl, {
      method: "HEAD",
    });
    return response.ok;
  } catch (error) {
    if (retries > 0) {
      return isAssetPublished(path, retries - 1);
    }

    log.error(
      `Error fetching URL: "${assetUrl}", derived from path: "${path}".`,
      { error }
    );
    throw error;
  }
}

// Returns a list of assets referenced by `assetVersions` which are NOT uploaded
// to GCS. If an empty list is returned, all assets are available in GCS.
export async function getNonPublishedAssetPaths() {
  const paths = Object.keys(assetVersions.paths);
  // Limit the number of assets we verify in parallel to avoid hitting network
  // limit errors.
  const verifyPromises = mapAsyncPool(paths, (x) => isAssetPublished(x, 3), 32);
  const verifications = await Promise.all(verifyPromises);

  return [...Array(paths.length).keys()].flatMap((i) =>
    verifications[i] ? [] : [paths[i]]
  );
}

export function getPublicAssetBaseUrl() {
  const url = absoluteBucketURL(assetDataBucketName, "");
  // Remove the trailing slash.
  return url[url.length - 1] == "/" ? url.slice(0, -1) : url;
}
