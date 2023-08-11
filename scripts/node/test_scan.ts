import { scriptInit } from "@/server/shared/script_init";
import { Redis } from "ioredis";

async function scanRedis(...redisi: Redis[]): Promise<Set<string>> {
  const keys = new Set<string>();
  let idx = 0;
  let cursor = "0";
  while (true) {
    const [nextCursor, page] = await redisi[idx++ % redisi.length].scan(
      cursor,
      "COUNT",
      1000
    );
    for (const key of page) {
      keys.add(key);
    }
    cursor = nextCursor;
    if (cursor === "0") {
      break;
    }
  }
  return keys;
}

async function main() {
  await scriptInit();

  const a = new Redis(9000);
  const b = new Redis(9001);

  const names = ["a", "b", "ab", "ba"];

  const results = await Promise.all([
    scanRedis(a),
    scanRedis(b),
    scanRedis(a, b),
    scanRedis(b, a),
  ]);

  a.disconnect();
  b.disconnect();

  for (let i = 0; i < results.length; ++i) {
    const isize = results[i].size;
    for (let j = i + 1; j < results.length; ++j) {
      const jsize = results[j].size;
      if (isize !== jsize) {
        console.log(`Mismatch ${names[i]}=${isize} != ${names[j]}=${jsize}`);
      }
    }
  }
}

main();
