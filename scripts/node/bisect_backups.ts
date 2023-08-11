import * as cloud_storage from "@/server/web/cloud_storage/cloud_storage";
import { File } from "@google-cloud/storage";
import { ok } from "assert";
import { mkdtempSync, rmSync, rmdirSync } from "fs";

// Downloads backups starting after the start date, and before the end date, and
// looks for the backup where the `good` function switches from true to false.
export async function bisectBackups(
  start: Date,
  end: Date,
  good: (backupFile: string) => Promise<boolean>
) {
  const bucket = cloud_storage.getStorageBucketInstance("biomes-backup");
  ok(bucket);
  const files = (await bucket.getFiles())[0]
    .map((x) => ({
      file: x,
      created: new Date(x.metadata.timeCreated),
    }))
    .filter((x) => x.created > start && x.created < end)
    .sort((a, b) => a.created.getTime() - b.created.getTime());

  const tempDir = mkdtempSync("bisect-backups-");
  console.log(`Work directory is ${tempDir}`);

  try {
    // Okay we have our list of backup files to go through, first check the
    // endpoints and make sure that they match our expectations.
    const firstFile = files[0].file;
    const lastFile = files[files.length - 1].file;
    const [firstGood, lastGood] = await Promise.all([
      checkIfFileGood(good, tempDir, firstFile),
      checkIfFileGood(good, tempDir, lastFile),
    ]);
    if (!firstGood) {
      console.error(
        `First backup ("${firstFile.name}") is bad, no good backups in range`
      );
      return;
    }
    if (lastGood) {
      console.error(
        `Last backup ("${lastFile.name}") is good, no bad backups in range`
      );
      return;
    }

    // Now start the bisection.
    let goodIndex = 0;
    let badIndex = files.length - 1;
    while (true) {
      const testIndex = Math.floor((goodIndex + badIndex) / 2);
      if (testIndex === goodIndex) {
        break;
      }

      // Print how many steps are remaining.
      const stepsRemaining = Math.ceil(Math.log2(badIndex - goodIndex));
      console.log(
        `Steps remaining: ${stepsRemaining} (${goodIndex} to ${badIndex})`
      );

      const testFile = files[testIndex].file;
      const testGood = await checkIfFileGood(good, tempDir, testFile);
      if (testGood) {
        goodIndex = testIndex;
      } else {
        badIndex = testIndex;
      }
    }

    console.log();
    console.log(
      `Last good backup is gs://biomes-backup/${files[goodIndex].file.name}`
    );
    console.log(
      `First bad backup is gs://biomes-backup/${files[badIndex].file.name}`
    );
  } finally {
    rmdirSync(tempDir, { recursive: true });
  }
}

async function checkIfFileGood(
  good: (backupFile: string) => Promise<boolean>,
  dir: string,
  file: File
): Promise<boolean> {
  const localPath = `${dir}/${file.name.split("/").pop()}`;
  try {
    console.log(`Downloading ${file.name}...`);
    await file.download({ destination: localPath });
    console.log(`Finished downloading ${file.name}, checking...`);
    const isGood = await good(localPath);
    console.log(`Finished checking ${file.name} (good=${isGood})`);
    return isGood;
  } finally {
    rmSync(localPath);
  }
}
