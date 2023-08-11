import assetVersions from "@/galois/interface/gen/asset_versions.json";
import { scriptInit } from "@/server/shared/script_init";
import { downloadFromBucket } from "@/server/web/cloud_storage/cloud_storage";
import { getBiscuits } from "@/shared/bikkie/active";
import { AnyBikkieAttributeOfType } from "@/shared/bikkie/attributes";
import { attribs } from "@/shared/bikkie/schema/attributes";
import {
  AnyBinaryAttribute,
  allPathsForAttribute,
  isAnyBinaryAttribute,
  zAnyBinaryAttribute,
} from "@/shared/bikkie/schema/binary";
import { log } from "@/shared/logging";
import { WorkQueue } from "@/shared/util/async";
import { asyncBackoffOnAllErrors } from "@/shared/util/retry_helpers";
import { mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import { loadBikkieForScript } from "./helpers/bikkie";

export async function extractAssets(targetDir?: string) {
  if (!targetDir) {
    log.fatal(`Usage: node extract_assets.js <directory>`);
    return;
  }

  await scriptInit(["internal-auth-token"]);

  await mkdir(targetDir, { recursive: true });

  const work = new WorkQueue();
  console.log("Downloading Bikkie assets...");
  await extractBikkie(targetDir, work);
  console.log();

  console.log("Downloading Galois assets...");
  await extractGalois(targetDir, work);
  console.log();

  await work.flush();
  console.log("All done.");
}

async function extractBikkie(targetDir: string, work: WorkQueue) {
  const bucketName = "biomes-bikkie";
  targetDir = `${targetDir}/${bucketName}`;

  await loadBikkieForScript();

  const binaryAttributes: AnyBikkieAttributeOfType<
    typeof zAnyBinaryAttribute
  >[] = [];
  for (const attribute of attribs.all) {
    if (isAnyBinaryAttribute(attribute.type())) {
      binaryAttributes.push(
        attribute as AnyBikkieAttributeOfType<typeof zAnyBinaryAttribute>
      );
    }
  }

  for (const biscuit of getBiscuits()) {
    for (const { name } of binaryAttributes) {
      const value = biscuit[name as keyof typeof biscuit] as AnyBinaryAttribute;
      if (!value) {
        continue;
      }
      const paths = allPathsForAttribute(value);
      if (paths.length === 0) {
        continue;
      }
      await work.add(async () => {
        for (const path of paths) {
          console.log(path);
          const data = await asyncBackoffOnAllErrors(
            () => downloadFromBucket(bucketName, path),
            {
              baseMs: 250,
              maxAttempts: 10,
            }
          );
          const filename = `${targetDir}/${path}`;
          await mkdir(dirname(filename), { recursive: true });
          await writeFile(filename, data);
        }
      });
    }
  }

  await work.flush();
}

async function extractGalois(targetDir: string, work: WorkQueue) {
  const bucketName = "biomes-static";
  targetDir = `${targetDir}/${bucketName}`;

  for (const [name, path] of Object.entries(assetVersions.paths)) {
    await work.add(async () => {
      console.log(`${name} (${path})`);
      const data = await asyncBackoffOnAllErrors(
        () => downloadFromBucket(bucketName, path),
        {
          baseMs: 250,
          maxAttempts: 10,
        }
      );
      const filename = `${targetDir}/${path}`;
      await mkdir(dirname(filename), { recursive: true });
      await writeFile(filename, data);
    });
  }

  await work.flush();
}

const [targetDir] = process.argv.slice(2);
extractAssets(targetDir);
