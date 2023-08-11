import { backupFileToEntityStream } from "@/server/backup/stats";
import { ok } from "assert";

async function main() {
  const from = process.argv.length > 2 ? process.argv[2] : undefined;
  ok(from, "Expected backup file as argument");

  let entityCount = 0;
  let stringSize = 0;
  let binSize = 0;

  for await (const entity of backupFileToEntityStream(from)) {
    if (!entity.shard_seed?.buffer) {
      continue;
    }
    entityCount++;
    stringSize += Buffer.from(entity.shard_seed.buffer).toString(
      "base64"
    ).length;
    binSize += entity.shard_seed.buffer.length;
  }
  console.log("Total Shard Seeds: ", entityCount);
  console.log(
    "Current String Size: ",
    stringSize,
    " ",
    ((stringSize * 2) / 1024).toFixed(2),
    "KB"
  );
  console.log(
    "Current Binary Size: ",
    binSize,
    " ",
    (binSize / 1024).toFixed(2),
    "KB ",
    (((stringSize - binSize) / stringSize) * 100).toFixed(2),
    "% smaller (",
    (((stringSize * 2 - binSize) / stringSize / 2) * 100).toFixed(2),
    "% smaller with UTF-16 encoding)"
  );
}

main();
