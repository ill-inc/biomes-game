import * as cloud_storage from "@/server/web/cloud_storage/cloud_storage";
import { log } from "@/shared/logging";
import LRU from "lru-cache";
import type { NullableMappedPosition } from "source-map";
import { SourceMapConsumer } from "source-map";

// The regular expression to extract source url and line/column number from a
// line of a stack trace.
const STACK_FRAME_RE = new RegExp(
  `(?<sourceUrl>[^\\s\\(\\@)]*\\.js):(?<line>[0-9]+):(?<column>[0-9]+)`
);

export class SourceMapCache {
  lru = new LRU({
    max: 50,
    fetchMethod: async (key, _staleValue, _) => {
      try {
        const rawSourceMap = await fetchSourceMapForSourceUrl(key as string);
        const consumer = await new SourceMapConsumer(rawSourceMap);
        return consumer;
      } catch (error) {
        log.warn(`Could not fetch source map for ${key}: ${error}`);
        return error;
      }
    },
    dispose: (value, _key) => {
      if (value instanceof SourceMapConsumer) {
        // The SourceMapConsumer objects are backed by wasm code and allocations
        // that needs to be cleaned up explicitly afterwards.
        value.destroy();
      }
    },
  });

  constructor() {}

  async lookup(
    sourceUrl: string,
    line: number,
    column: number
  ): Promise<NullableMappedPosition> {
    const sourceMapConsumer = await this.lru.fetch(sourceUrl);
    if (sourceMapConsumer instanceof SourceMapConsumer) {
      return sourceMapConsumer.originalPositionFor({ line, column });
    } else {
      return { source: null, line: null, column: null, name: null };
    }
  }

  // Cleans up the cached SourceMapConsumer objects.
  stop() {
    this.lru.clear();
  }
}

// Based on the URL of the original source file, find a GCS bucket path for
// the corresponding source map, download it, and return it.
async function fetchSourceMapForSourceUrl(sourceUrl: string): Promise<string> {
  const bucket = cloud_storage.getStorageBucketInstance("biomes-source-maps");

  if (!bucket) {
    return "";
  }

  const pathStart = sourceUrl.indexOf("_next/");
  const sourcePath =
    pathStart == -1
      ? `_next/static/chunks/${sourceUrl}`
      : sourceUrl.substring(pathStart);
  const contents = await bucket.file(`${sourcePath}.map`).download();
  return contents.toString();
}

// Converts the referenced stack frames in an error stack frame into a new
// error stack frame with each line source mapped (if possible). E.g. you might
// give it something like this for input:
//
//   Error
//       at e.t.maybeSendErrorToServer (https://static.biomes.gg/_next/static/chunks/6569-f426f0640916c777.js:1:650712)
//       at https://static.biomes.gg/_next/static/chunks/6569-f426f0640916c777.js:1:650038
//   ...
//
export async function applySourceMapToCallstack(
  callstack: string,
  cache?: SourceMapCache
): Promise<string> {
  let onExit = () => {};
  if (!cache) {
    // If a source map lookup object was not provided, create a temporary one.
    cache = new SourceMapCache();
    onExit = () => cache!.stop();
  }

  try {
    return await applySourceMapToCallstackWithCache(callstack, cache);
  } finally {
    onExit();
  }
}

export function parseSourceLine(line: string) {
  const parsed = STACK_FRAME_RE.exec(line);
  if (!parsed?.groups) {
    return undefined;
  }

  const generatedLine = parseInt(parsed.groups.line);
  const generatedColumn = parseInt(parsed.groups.column);

  return {
    source: parsed.groups.sourceUrl,
    line: generatedLine,
    column: generatedColumn,
  };
}

export async function applySourceMapToLine(
  line: string,
  cache: SourceMapCache
) {
  const parsed = parseSourceLine(line);
  if (!parsed) {
    return line;
  }

  const result = await cache.lookup(parsed.source, parsed.line, parsed.column);

  if (result.source == null) {
    return line;
  }

  const resultLocation = `${result.source}:${result.line}:${result.column}`;
  if (result.name) {
    return `    at ${result.name} (${resultLocation})`;
  } else {
    return `    at ${resultLocation}`;
  }
}

async function applySourceMapToCallstackWithCache(
  callstack: string,
  cache: SourceMapCache
): Promise<string> {
  const lines = callstack
    .split("\n")
    .map((line) => applySourceMapToLine(line, cache));

  return (await Promise.all(lines)).join("\n");
}
