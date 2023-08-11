/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @next/next/no-assign-module-variable */
// @ts-ignore
import simd_voxeloo_js_wasm_location from "@/gen/shared/cpp_ext/voxeloo-simd/wasm.wasm";
// @ts-ignore
import normal_voxeloo_js_wasm_location from "@/gen/shared/cpp_ext/voxeloo-normal/wasm.wasm";
// @ts-ignore
import type { WasmBinary } from "@/client/game/client_config";
import { WasmSimd } from "@/client/game/client_config";
import { log, setVoxelooForExceptionReporting } from "@/shared/logging";
import { Timer } from "@/shared/metrics/timer";
import { makeCvalHook } from "@/shared/util/cvals";
import { makeWasmMemory } from "@/shared/wasm/memory";
import type { VoxelooModule } from "@/shared/wasm/types";

export interface WasmConfig {
  wasmBinary: WasmBinary;
  voxelooMemoryMb: number;
}

// Registers the base voxeloo web assmebly module.
export async function loadVoxeloo(
  clientConfig: WasmConfig
): Promise<VoxelooModule> {
  const loadFrom = async (
    wasmLocation: string,
    { default: wasmLoader }: { default: (Module: any) => any }
  ) => {
    const timer = new Timer();
    log.info(
      `Loading WASM (simd=${clientConfig.wasmBinary.simd}, memory=${clientConfig.voxelooMemoryMb}MB) from ${wasmLocation}`
    );
    if ("voxeloo" in globalThis) {
      log.warn(
        "Global voxeloo already exists, but we are constructing another. Using global "
      );
      return (globalThis as any).voxeloo;
    }

    const module = await wasmLoader({
      locateFile: () => wasmLocation,
      wasmMemory: makeWasmMemory(clientConfig.voxelooMemoryMb),
      printErr: (error: string) => {
        log.error(`ERROR[Voxeloo]: "${error}"`, { error });
      },
    });

    makeCvalHook({
      path: ["memory", "voxeloo", "totalMemory"],
      help: "Total memory available to our WebAssembly code. Depending on settings, may grow on demand.",
      collect: () => {
        return module.get_total_memory();
      },
    });
    makeCvalHook({
      path: ["memory", "voxeloo", "usedMemory"],
      help: "Amount of WASM memory currently allocated. Can never be more than total_memory. Tracks not-yet-free()'d malloc()s.",
      collect: () => {
        return module.get_used_memory();
      },
    });
    makeCvalHook({
      path: ["memory", "voxeloo", "freeMemory"],
      help: "Amount of WASM memory free and available to be malloc()'d.",
      collect: () => {
        return module.get_total_memory() - module.get_used_memory();
      },
    });

    module.registerErrorLogger((error: string) => {
      log.error(`Error in voxeloo: "${error}"`);
    });

    log.info(`Voxeloo WASM loaded in ${timer.elapsed}ms`);
    setVoxelooForExceptionReporting(module as VoxelooModule);

    return module as VoxelooModule;
  };

  if (clientConfig.wasmBinary.simd === WasmSimd.Simd) {
    return loadFrom(
      simd_voxeloo_js_wasm_location,
      await import("@/gen/shared/cpp_ext/voxeloo-simd/wasm")
    );
  } else {
    return loadFrom(
      normal_voxeloo_js_wasm_location,
      await import("@/gen/shared/cpp_ext/voxeloo-normal/wasm")
    );
  }
}
