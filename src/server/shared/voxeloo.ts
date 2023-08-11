/* eslint-disable @next/next/no-assign-module-variable */
import wasmLoader from "@/gen/shared/cpp_ext/voxeloo-simd/wasm";
import { log, setVoxelooForExceptionReporting } from "@/shared/logging";
import { makeWasmMemory } from "@/shared/wasm/memory";
import type { VoxelooModule } from "@/shared/wasm/types";
import { readFile } from "fs/promises";
import path from "path";

const DEFAULT_SERVER_WASM_MEMORY = 1048;

function getWasmMemoryMb() {
  if (process.env.WASM_MEMORY) {
    return parseInt(process.env.WASM_MEMORY);
  } else {
    return DEFAULT_SERVER_WASM_MEMORY;
  }
}

let loadedVoxeloo: VoxelooModule | undefined;

export async function loadVoxeloo(): Promise<VoxelooModule> {
  if (loadedVoxeloo) {
    return loadedVoxeloo;
  }
  const wasmFile = path.resolve(
    __dirname,
    "../../gen/shared/cpp_ext/voxeloo-simd/wasm.wasm"
  );

  const module = await wasmLoader({
    wasmBinary: await readFile(wasmFile),
    wasmMemory: makeWasmMemory(getWasmMemoryMb()),
    printErr: (error: string) => {
      log.error(`ERROR[Voxeloo]: "${error}"`, { error });
    },
  });
  setVoxelooForExceptionReporting(module);

  module.registerErrorLogger((error: string) => {
    log.error(`Error in voxeloo: "${error}"`);
  });
  log.info("Loaded WASM");
  loadedVoxeloo = module as VoxelooModule;
  return module as VoxelooModule;
}
