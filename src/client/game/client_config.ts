import { supportsPointerLock } from "@/client/components/contexts/PointerLockContext";
import type { ObserverMode } from "@/client/game/util/observer";
import type { GraphicsQuality } from "@/client/util/typed_local_storage";
import { zGraphicsQuality } from "@/client/util/typed_local_storage";
import type { Vec2f } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { GaussianDistribution } from "@/shared/math/gaussian";
import type { BiomesResourceCapacities } from "@/shared/resources/biomes";
import { makeCvalHook } from "@/shared/util/cvals";
import type { Vec3f } from "@/shared/wasm/types/common";
import { ok } from "assert";
import { getGPUTier } from "detect-gpu";
import { cloneDeep, includes } from "lodash";
import { UAParser } from "ua-parser-js";
import { simd } from "wasm-feature-detect";

export enum WasmSimd {
  Normal = "normal",
  Simd = "simd",
}

export interface WasmBinary {
  simd: WasmSimd;
}

export type InitConfigOptions = {
  forceLowMemory?: boolean;
  startCoordinates?: Vec3f;
  startOrientation?: Vec2f;
  observerMode?: ObserverMode;
  bikkieTrayId?: BiomesId;
  allowSoftwareWebGL?: boolean;
  primaryCTA?: "discord" | "login";
};

export type ClientConfig = typeof BASE_CLIENT_CONFIG;

const BASE_CLIENT_CONFIG = {
  dev: false,
  showVirtualJoystick: false,
  forceCharacterSetup: false,
  lowMemory: false,
  unsupportedBrowser: false,
  skipBikkieReactInvalidate: false,
  oldTextures: false,
  primaryCTA: "login" as "discord" | "login" | undefined,
  initialObserverMode: undefined as ObserverMode | undefined,
  startCoordinates: undefined as Vec3f | undefined,
  startOrientation: undefined as Vec2f | undefined,
  hideChrome: false,
  syncBaseUrl: "api",
  useProdSync: true,
  useWorker: false,
  sharedArrayBufferSupported: true,
  // Client-side value only used for UI flavoring when trying to pick up items with a full inventory
  // Should match the sernver value.
  gameDropPickupDistance: 4,
  // Server-validated in server config. This value should always be less than the server gameDropDistance
  gameDropDistance: 5,
  gameThrowDistance: 8,
  wasmBinary: { releaseType: "release", simd: "normal" } as WasmBinary,
  // This should be less than the server's CONFIG.gamePlayerExpirationSecs
  keepAliveIntervalMs: 5000,
  wasmMemoryTracing: false,
  // Applies an artificial latency to client websocket communications.
  // This is round trip latency (so send lag + receive lag), and is sampled
  // from a Gaussian (default variance such that 95% of samples will be within
  // 50% of the mean).
  artificialLagMs: undefined as GaussianDistribution | undefined,
  clientResourceCapacity: {
    count: 140_000,
    labels: {
      blockMeshes: 1300,
    },
  } satisfies BiomesResourceCapacities,
  voxelooMemoryMb: 1024,
  useIdbForEcs: false,
  gpuTier: 0,
  gpuName: "Unknown",
  forceDrawDistance: undefined as number | undefined,
  forceRenderScale: undefined as number | undefined,
  forceGraphicsQuality: undefined as GraphicsQuality | undefined,
  allowSoftwareWebGL: false,
};

function adjustConfigForLowMemory(clientConfig: ClientConfig) {
  makeCvalHook({
    path: ["game", "capabilities", "lowMemory"],
    help: "Running in low-memory mode, e.g. because a 32-bit browser is detected.",
    collect: () => clientConfig.lowMemory,
  });
  if (!clientConfig.lowMemory) {
    return;
  }

  const VOXELOO_MEMORY_SCALE = 0.5;

  // On low memory or 32-bit systems it can be difficult to allocate a large
  // chunk of contiguous memory, so in low memory mode we allocate a smaller
  // chunk for voxeloo memory.
  clientConfig.voxelooMemoryMb *= VOXELOO_MEMORY_SCALE;

  // With less voxeloo memory, we must reduce our resource capacity
  // proportionally, since most resources require voxeloo memory.
  scaleResourceCapacity(clientConfig, VOXELOO_MEMORY_SCALE);
}

function scaleResourceCapacity(clientConfig: ClientConfig, scale: number) {
  clientConfig.clientResourceCapacity = {
    count: clientConfig.clientResourceCapacity.count * scale,
    labels: Object.fromEntries(
      Object.entries(clientConfig.clientResourceCapacity.labels).map(
        ([k, v]) => [k, v ? v * scale : undefined]
      )
    ) as any,
  };
}

function doURLOverrides(clientConfig: ClientConfig) {
  const params = new URLSearchParams(window.location.search);

  const applyParam = (name: string, fn: (value: string) => void) => {
    const param = params.get(name);
    if (param !== null) {
      fn(param);
    }
  };
  applyParam("syncBaseUrl", (val) => {
    clientConfig.syncBaseUrl = val;
  });

  applyParam("lowMemory", (val) => {
    clientConfig.lowMemory = val === "1";
  });

  // Make config adjustments now before they could be overridden with even
  // more specific URL params.
  adjustConfigForLowMemory(clientConfig);

  applyParam("resourceCapacityScale", (val) => {
    const scale = parseFloat(val);
    if (isNaN(scale) || scale < 0) {
      log.error(`Invalid value ${val} for resourceCapacityScale.`);
    } else {
      scaleResourceCapacity(clientConfig, scale);
    }
  });
  applyParam("forceDrawDistance", (val) => {
    const forceDrawDistance = parseInt(val);
    if (isNaN(forceDrawDistance) || forceDrawDistance < 0) {
      log.error(`Invalid value ${val} for forceDrawDistance.`);
    } else {
      clientConfig.forceDrawDistance = forceDrawDistance;
    }
  });
  applyParam("forceRenderScale", (val) => {
    const forceRenderScale = parseFloat(val);
    if (isNaN(forceRenderScale) || forceRenderScale < 0) {
      log.error(`Invalid value ${val} for forceRenderScale.`);
    } else {
      clientConfig.forceRenderScale = forceRenderScale;
    }
  });
  applyParam("forceGraphicsQuality", (val) => {
    const parsed = zGraphicsQuality.safeParse(val);
    if (!parsed.success) {
      log.error(`Invalid value ${val} for forceGraphicsQuality.`);
    } else {
      clientConfig.forceGraphicsQuality = parsed.data;
    }
  });
  applyParam("prodSync", (val) => {
    clientConfig.useProdSync = val === "1";
  });
  applyParam("dev", (val) => {
    clientConfig.dev = val === "1";
  });
  applyParam("hideChrome", (val) => {
    clientConfig.hideChrome = val === "1";
  });
  applyParam("useWorker", (val) => {
    clientConfig.useWorker = val === "1";
  });

  applyParam("forceCharacterSetup", (val) => {
    clientConfig.forceCharacterSetup = val === "1";
  });

  applyParam("skipBikkieReactInvalidate", (val) => {
    clientConfig.skipBikkieReactInvalidate = val === "1";
  });

  applyParam("wasmMemoryTracing", (val) => {
    // Tracing won't work in release mode, so force us into the next fastest
    // mode that supports tracing.
    clientConfig.wasmMemoryTracing = val === "1";
  });
  applyParam("wasmSimd", (val) => {
    ok(includes(WasmSimd, val), `Invalid wasm SIMD: '${val}'`);
    clientConfig.wasmBinary.simd = val as WasmSimd;
  });
  applyParam("artificialLagMs", (val) => {
    const num = parseInt(val);
    if (isNaN(num) || num < 0) {
      log.error(`Invalid artificial lag: '${val}'`);
    } else {
      clientConfig.artificialLagMs = {
        mean: num,
        // Make sure ~95% of samples fall within 50% of the mean.
        variance: (num / 6) ** 2,
      };
    }
  });
  applyParam("idb", (val) => {
    clientConfig.useIdbForEcs = val === "1";
  });
  applyParam("gpuTier", (val) => {
    const num = parseInt(val);
    if (isNaN(num) || num < 0) {
      log.error(
        `Invalid value, ${val}, for gpuTier parameter. Must be a non-negative number.`
      );
    } else {
      clientConfig.gpuTier = num;
    }
  });
  applyParam("allowSoftwareWebGL", (val) => {
    clientConfig.allowSoftwareWebGL = val === "1";
  });
}

export function doBrowserOverrides(ret: ClientConfig) {
  const uaParser = new UAParser(window.navigator.userAgent);

  ret.showVirtualJoystick = !supportsPointerLock();

  if (uaParser.getDevice().type === "mobile") {
    log.info("Mobile device detected, forcing low memory config.");
    ret.lowMemory = true;
  }

  if (
    uaParser.getOS().name?.toLowerCase().includes("Android") &&
    !ret.showVirtualJoystick
  ) {
    // Android devices support pointer lock for some reason, so use
    // another method to pop the virtual joystick.
    log.info("Android detected, forcing virtual joystick.");
    ret.showVirtualJoystick = true;
  }

  const browserName = uaParser.getBrowser().name?.toLowerCase() ?? "";
  if (browserName.includes("firefox")) {
    ret.unsupportedBrowser = true;
  }

  if (browserName.includes("safari")) {
    // At the time of this change, Safari (16.5) seems to have some bugs when
    // interpreting SIMD instructions.
    //   https://linear.app/ill-inc/issue/GI-3562/terrain-collisions-arent-working-on-safari
    ret.wasmBinary.simd = WasmSimd.Normal;
  }
}

export async function genGPUTier() {
  const ret = await getGPUTier({
    // The data at the following URL is generated by the
    // `scripts/update_detect_gpu_benchmarks.sh` script.
    // If you want to adjust the benchmark data we use for GPU tier
    // classification, update and re-run that script, then update this URL.
    benchmarksURL:
      "https://storage.googleapis.com/biomes-static/gpu-benchmarks/2023-06-16_cc4f7417",
    desktopTiers: [
      0, // Gpu tier 0 is for GPUs we don't think we can support.
      10, // Gpu tier 1 is for our low end but still supported GPUs.
      60, // Gpu tier 2 is for our mid range GPUs.
      400, // Gpu tier 3 is for high end GPUs.
    ],
  });

  return ret;
}

export async function initializeClientConfig(
  options?: InitConfigOptions
): Promise<ClientConfig> {
  const [gpuTier, simdSupported] = await Promise.all([genGPUTier(), simd()]);
  log.info(`GPU Tier Info is ${JSON.stringify(gpuTier)}`);

  makeCvalHook({
    path: ["game", "capabilities", "gpu"],
    help: "Information about the client's GPU capabilities.",
    collect: () => {
      return gpuTier;
    },
  });
  makeCvalHook({
    path: ["game", "capabilities", "simdSupported"],
    help: "Does the client support SIMD instructions.",
    collect: () => simdSupported,
  });

  const ret = cloneDeep(BASE_CLIENT_CONFIG);

  ret.primaryCTA = options?.primaryCTA;

  if (process.env.NODE_ENV !== "production") {
    // Enable "dev" mode by default if we're connecting to localhost.
    ret.syncBaseUrl = `http://${window.location.hostname ?? "127.0.0.1"}:${
      process.env.SYNC_PORT
    }/`;
    ret.dev = true;
  }
  ret.lowMemory = !!options?.forceLowMemory;
  ret.startCoordinates = options?.startCoordinates;
  ret.startOrientation = options?.startOrientation;
  ret.initialObserverMode = options?.observerMode;
  ret.allowSoftwareWebGL = options?.allowSoftwareWebGL ?? false;

  ret.gpuTier = gpuTier.tier;
  ret.gpuName = gpuTier.gpu || "Unknown";
  ret.wasmBinary.simd = simdSupported ? WasmSimd.Simd : WasmSimd.Normal;
  ret.sharedArrayBufferSupported = window.crossOriginIsolated;

  doBrowserOverrides(ret);
  doURLOverrides(ret);

  makeCvalHook({
    path: ["game", "capabilities", "gpuTier"],
    help: "The GPU tier used by this client, affected by URL parameters.",
    collect: () => {
      return ret.gpuTier;
    },
  });
  makeCvalHook({
    path: ["game", "capabilities", "simd"],
    help: "True if the client is using the simd wasm.",
    collect: () => (ret.wasmBinary.simd === WasmSimd.Simd ? true : false),
  });

  return ret;
}
