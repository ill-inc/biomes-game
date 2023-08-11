import type { Settings } from "@/client/util/typed_local_storage";
import {
  getTypedStorageItem,
  zSettings,
} from "@/client/util/typed_local_storage";
import { makeCvalHook } from "@/shared/util/cvals";
import type { JSONable } from "@/shared/util/type_helpers";
import UAParser from "ua-parser-js";

// `performance.memory` is a Chrome-specific feature.
type PerformanceMemory = {
  totalJSHeapSize: number;
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
};
function performanceMemory(): PerformanceMemory | undefined {
  const perfMem = performance as Performance & { memory?: PerformanceMemory };
  if (!perfMem.memory || typeof perfMem.memory !== "object") {
    return undefined;
  }

  if (
    perfMem.memory.totalJSHeapSize &&
    typeof perfMem.memory.totalJSHeapSize === "number" &&
    perfMem.memory.usedJSHeapSize &&
    typeof perfMem.memory.usedJSHeapSize === "number" &&
    perfMem.memory.jsHeapSizeLimit &&
    typeof perfMem.memory.jsHeapSizeLimit === "number"
  ) {
    return perfMem.memory;
  }

  return undefined;
}

export function initializeSystemCvals() {
  makeCvalHook({
    path: ["game", "clientLifetime"],
    help: "Length of time the client's been alive for, in seconds.",
    collect: () => performance.now() / 1000,
  });

  if (performanceMemory()) {
    makeCvalHook({
      path: ["memory", "usedJSHeapSize"],
      help: "Number of bytes allocated towards JS heap, as reported by performance.memory.usedJSHeapSize.",
      collect: () => performanceMemory()?.usedJSHeapSize ?? 0,
    });
  }

  const platformObject = getPlatformObject(navigator.userAgent);
  makeCvalHook({
    path: ["game", "capabilities", "platform"],
    help: "Information about the platform (e.g. browser/OS) that the user is playing the game on.",
    collect: () => platformObject,
  });

  makeCvalHook({
    path: ["game", "userSettings"],
    help: "The set of options that the user has adjusted.",
    collect: () => {
      const adjustedEntries: [keyof Settings, JSONable][] = [];
      for (const kAsString in zSettings.shape) {
        const k = kAsString as keyof Settings;
        const value = getTypedStorageItem(k);
        if (value !== null) {
          adjustedEntries.push([k, value]);
        }
      }
      return Object.fromEntries(adjustedEntries);
    },
  });
}

function getPlatformObject(userAgent: string) {
  const uaParser = new UAParser(userAgent);
  return {
    os: uaParser.getOS().name ?? "Unknown",
    osVerison: uaParser.getOS().version ?? "Unknown",
    cpu: uaParser.getCPU().architecture ?? "Unknown",
    deviceModel: uaParser.getDevice().model ?? "Unknown",
    deviceVendor: uaParser.getDevice().vendor ?? "Unknown",
    deviceType: uaParser.getDevice().type ?? "Unknown",
    browser: uaParser.getBrowser().name ?? "Unknown",
    browserVersion: uaParser.getBrowser().version ?? "Unknown",
    engine: uaParser.getEngine().name ?? "Unknown",
  };
}
