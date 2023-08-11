import { getAsset, matchingAssets } from "@/galois/assets";
import type { ExportOutput, Exporter } from "@/galois/assets/scripts/export";
import { isSignal } from "@/galois/interface/types/data";
import {
  getPublicAssetBaseUrl,
  publish,
} from "@/server/web/published_asset_data";
import { ok } from "assert";
import { readFileSync, writeFileSync } from "fs";
import { hash } from "spark-md5";
import { z } from "zod";

const zAssetIndex = z.object({
  paths: z.record(z.string()),
});

type AssetIndex = z.infer<typeof zAssetIndex>;

function loadAssetIndex(path: string): AssetIndex {
  const data = readFileSync(path).toString();
  return zAssetIndex.parse(JSON.parse(data));
}

class AssetIndexBuilder {
  map = new Map<string, string>();

  constructor(index: AssetIndex) {
    for (const [path, dst] of Object.entries(index.paths)) {
      this.map.set(path, dst);
    }
  }

  add(assetPath: string, filePath: string) {
    this.map.set(assetPath, filePath);
  }

  build() {
    // Sort the entries to ensure they appear in a consistent order in the dump.
    const sortedEntries = Object.fromEntries(
      Array.from(this.map.entries()).sort(([ak, _av], [bk, _bv]) =>
        ak.localeCompare(bk)
      )
    );
    return JSON.stringify(
      {
        paths: sortedEntries,
      },
      null,
      2
    );
  }
}

function toPublicAssetPath(path: string, result: ExportOutput) {
  const version = hash(result.data.toString());
  const filepath = `${path}.${version}.${result.extension}`;
  return `asset_data/${filepath}`;
}

async function publishAssets(
  assetPaths: (RegExp | string)[],
  exporter: Exporter,
  index: AssetIndexBuilder,
  filter: RegExp | undefined,
  dryRun: boolean
) {
  const assetsUnfiltered = [
    ...new Set(
      assetPaths.flatMap((pathPattern) => {
        if (pathPattern instanceof RegExp) {
          return matchingAssets(pathPattern);
        } else {
          ok(typeof pathPattern === "string");
          return [[pathPattern, getAsset(pathPattern)] as const];
        }
      })
    ),
  ];

  const assets = filter
    ? assetsUnfiltered.filter((x) => filter.test(x[0]))
    : assetsUnfiltered;

  await Promise.all(
    assets.map(async ([path, asset]): Promise<void> => {
      try {
        const result = await exporter.export({ ...asset, name: path });
        const publicRelativePath = toPublicAssetPath(path, result);

        // Update the asset versions index to include the new data.
        index.add(path, publicRelativePath);

        // Write the data to GCS.
        if (!dryRun) {
          const uploadPromise = publish(publicRelativePath, result.data);
          console.log(
            `Published ${publicRelativePath} to remote asset storage...`
          );
          return await uploadPromise;
        } else {
          console.log(`Built ${publicRelativePath} successfully.`);
        }
      } catch (e) {
        if (isSignal(e) && e.info === "unchanged") {
          return;
        } else {
          console.error(`Error while attempting to export "${path}".`);
          throw e;
        }
      }
    })
  );
}

export async function publishStaticAssetsAndIndex(
  assetPaths: (RegExp | string)[],
  indexFilePath: string,
  staticAssetHostFilePath: string,
  exporter: Exporter,
  filter: RegExp | undefined,
  dryRun: boolean
) {
  // If we're publishing with a filter active, initialize the VersionIndex with
  // the entries for all of the paths not in the filter since they will not
  // be modified.
  const index = new AssetIndexBuilder(loadAssetIndex(indexFilePath));
  try {
    await publishAssets(assetPaths, exporter, index, filter, dryRun);
  } catch (e) {
    console.log("Error publishing assets: ", e);
    throw e;
  }

  if (!dryRun) {
    writeFileSync(indexFilePath, index.build());
    writeFileSync(
      staticAssetHostFilePath,
      JSON.stringify({
        staticAssetBaseUrl: `${getPublicAssetBaseUrl()}/`,
      })
    );
    console.log(`Updated index "${indexFilePath}"...`);
  }
}
