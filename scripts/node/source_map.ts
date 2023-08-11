import { applySourceMapToLine, SourceMapCache } from "@/server/web/source_maps";
import readline from "readline";

// Use this script to deobfuscate a given stack trace.
// The source maps used for the translation will be looked up in the
// "biomes-source-maps" GCS bucket, which should have been produced at build
// time for each production build.
//
// Usage: The script takes no parameters, it just streams lines from stdin,
//        source maps them (if applicable) and then sends them to stdout.
//

async function main() {
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const sourceMapCache = new SourceMapCache();

  let outputQueue = Promise.resolve();

  for await (const line of rl) {
    const mappedLine = applySourceMapToLine(line, sourceMapCache);
    // While we can resolve the line source maps in any order, we need to print
    // them out in the same order they arrived.
    outputQueue = outputQueue.then(async () => console.log(await mappedLine));
  }

  await outputQueue;
  sourceMapCache.stop();
}

void main();
