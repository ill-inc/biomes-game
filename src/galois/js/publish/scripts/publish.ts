#!/usr/bin/env node

import { Exporter } from "@/galois/assets/scripts/export";
import { publishDefinitions } from "@/galois/publish/definitions";
import { publishStaticAssetsAndIndex } from "@/galois/publish/static";
import type { AssetServer } from "@/galois/server/interface";
import { PoolAssetServer } from "@/galois/server/server";
import { numCpus } from "@/server/shared/cpu";
import { checkApplicationDefaultCredentialsAvailable } from "@/server/shared/google_adc";
import { join } from "path";
import * as yargs from "yargs";

const publishedStaticAssetData = [
  new RegExp("^atlases/.*"),
  new RegExp("^audio/.*"),
  new RegExp("^gaia/.*"),
  new RegExp("^icons/.*"),
  new RegExp("^indices/.*"),
  new RegExp("^item_meshes/.*"),
  new RegExp("^mapping/.*"),
  new RegExp("^npcs/.*"),
  new RegExp("^placeables/.*"),
  new RegExp("^shapers/.*"),
  new RegExp("^textures/.*"),
  "wearables/animations",
];

const definitionsAssetData = new RegExp("definitions/.*");

const rootDir = join(__dirname, "../../../../..");
const galoisDir = join(rootDir, "src/galois");
const outputDefinitionsDir = join(rootDir, "src/shared/asset_defs/gen");

async function publishAll(
  server: AssetServer,
  filter: RegExp | undefined,
  dryRun: boolean
) {
  if (!dryRun && !(await checkApplicationDefaultCredentialsAvailable())) {
    return;
  }

  const exporter = new Exporter(server);

  console.log("Generating source files...");
  const definitions = await publishDefinitions(
    definitionsAssetData,
    outputDefinitionsDir,
    exporter,
    dryRun
  );

  console.log("Publishing asset data...");
  const assets = await publishStaticAssetsAndIndex(
    publishedStaticAssetData,
    join(galoisDir, "js/interface/gen/asset_versions.json"),
    join(galoisDir, "js/interface/gen/static_asset_host.json"),
    exporter,
    filter,
    dryRun
  );

  return [assets, definitions];
}

async function run() {
  const options = yargs
    .usage("$0 [args]")
    .options({
      dryRun: {
        default: false,
        type: "boolean",
        description: "If set, will not upload any assets to GCS.",
      },
      filter: {
        alias: "r",
        type: "string",
        description: "Only re-publishes assets matching this pattern.",
      },
      incremental: {
        alias: "i",
        default: true,
        type: "boolean",
        description: "Build assets in incremental mode.",
      },
    })
    .strict()
    .help()
    .parseSync();

  const filter = options.filter ? new RegExp(options.filter) : undefined;

  // Initialize the build server.
  const server = new PoolAssetServer(
    galoisDir,
    join(galoisDir, "data"),
    Math.max(1, numCpus() - 1),
    options.incremental ? ["--incremental"] : []
  );

  // Publish all assets and then clean things up.
  await publishAll(server, filter, options.dryRun);
  await server.stop();

  console.log("All done!");
}

if (require.main === module) {
  void run();
}
