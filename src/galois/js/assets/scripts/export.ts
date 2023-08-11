#!/usr/bin/env node

import { allAssets, getAsset } from "@/galois/assets";
import {
  AssetData,
  AssetDataMap,
  isError,
  isSignal,
} from "@/galois/interface/types/data";
import * as l from "@/galois/lang";
import type { AssetQuery, AssetServer } from "@/galois/server/interface";
import { BatchAssetServer } from "@/galois/server/server";
import { mkdirSync, writeFileSync } from "fs";
import * as path from "path";
import { performance } from "perf_hooks";
import * as yargs from "yargs";

class Builder {
  constructor(public server: AssetServer) {}

  async buildUntyped(asset: l.Asset): Promise<AssetData> {
    const data = await this.server.build(asset);
    if (isSignal(data)) {
      throw data;
    } else if (isError(data)) {
      throw new Error(data.info.join(""));
    } else {
      return data;
    }
  }

  async build<T extends keyof AssetDataMap>(
    asset: l.GeneralNode<T>
  ): Promise<AssetDataMap[T]> {
    return (await this.buildUntyped(asset)) as any as AssetDataMap[T];
  }
}

export interface ExportOutput {
  extension: string;
  data: Buffer | string;
}

export class Exporter {
  private readonly builder: Builder;

  constructor(server: AssetServer) {
    this.builder = new Builder(server);
  }

  private async exportBinary(asset: l.Binary) {
    const wrapper = await this.builder.build(asset);
    return { extension: "bin", data: Buffer.from(wrapper.data, "base64") };
  }

  private async exportPNG(asset: l.PNG) {
    const wrapper = await this.builder.build(asset);
    return { extension: "png", data: Buffer.from(wrapper.data, "base64") };
  }

  private async exportGLTF(asset: l.GLTF) {
    const wrapper = await this.builder.build(asset);
    return { extension: "gltf", data: wrapper.data };
  }

  private async exportGLB(asset: l.GLB) {
    const wrapper = await this.builder.build(asset);
    return { extension: "glb", data: Buffer.from(wrapper.data, "base64") };
  }

  private async exportWEBM(asset: l.WEBM) {
    const wrapper = await this.builder.build(asset);
    return { extension: "webm", data: Buffer.from(wrapper.data, "base64") };
  }

  private async exportSourceFile(asset: l.SourceFile) {
    const wrapper = await this.builder.build(asset);
    return { extension: wrapper.extension, data: wrapper.content };
  }

  private async exportTypeScript(asset: l.TypeScriptFile) {
    const wrapper = await this.builder.build(asset);
    return { extension: "ts", data: wrapper.data };
  }

  private async exportJson(asset: l.Asset) {
    const data = await this.builder.buildUntyped(asset);
    return { extension: "json", data: JSON.stringify(data, null, 2) };
  }

  async export(asset: AssetQuery): Promise<ExportOutput> {
    if (l.isNode(asset, "Binary")) {
      return this.exportBinary(asset);
    } else if (l.isNode(asset, "PNG")) {
      return this.exportPNG(asset);
    } else if (l.isNode(asset, "GLTF")) {
      return this.exportGLTF(asset);
    } else if (l.isNode(asset, "GLB")) {
      return this.exportGLB(asset);
    } else if (l.isNode(asset, "WEBM")) {
      return this.exportWEBM(asset);
    } else if (l.isNode(asset, "SourceFile")) {
      return this.exportSourceFile(asset);
    } else if (l.isNode(asset, "TypeScriptFile")) {
      return this.exportTypeScript(asset);
    } else {
      return this.exportJson(asset);
    }
  }
}

const galoisRootDir = path.join(__dirname, "../../..");

function getOutPath(name: string, extension: string) {
  const prefix = path.join(galoisRootDir, "/data/exports");
  return path.resolve(prefix, `${name}.${extension}`);
}
function write(outPath: string, data: string | Buffer) {
  const dirPath = path.dirname(outPath);
  mkdirSync(dirPath, { recursive: true });
  writeFileSync(outPath, data);
}

async function timed<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const start = performance.now();
  const value = await fn();
  return [value, performance.now() - start];
}

async function exportPaths(server: AssetServer, paths: string[]) {
  const exporter = new Exporter(server);

  // Export all of the materials.
  for (const path of paths) {
    const asset = getAsset(path);
    try {
      const [result, duration] = await timed(() => exporter.export(asset));
      const outPath = getOutPath(path, result.extension);
      write(outPath, result.data);
      console.log(
        `Exported: "${path}" => "${outPath}" (${duration.toFixed(0)}ms)`
      );
    } catch (e) {
      if (isSignal(e) && e.info === "unchanged") {
        console.error(`Skipped asset "${path}".`);
        continue;
      } else {
        console.error(`Error exporting asset "${path}".`);
        throw e;
      }
    }
  }
}

function run() {
  const options = yargs
    .options({
      filter: {
        alias: "r",
        default: "",
        type: "string",
        demandOption: true,
        description: "Filters exported assets to ones matching this regex",
      },
    })
    .options({
      printTimers: {
        alias: "t",
        default: false,
        type: "boolean",
        description: "Print detailed profiling/timing information to stderr",
      },
    })
    .parseSync();

  const filter = new RegExp(options.filter);
  const server = new BatchAssetServer(
    galoisRootDir,
    path.join(galoisRootDir, "/data"),
    options.printTimers ? ["--print_timers"] : []
  );

  const paths = allAssets()
    .map(([path]) => path)
    .filter((path) => path.match(filter));

  console.log("Exporting these bad boys...");
  void exportPaths(server, paths).then(() => server.stop());
}

if (require.main === module) {
  run();
}
