import { APIError } from "@/shared/api/errors";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { ReadonlyVec3f } from "@/shared/ecs/gen/types";
import { centerAABB } from "@/shared/math/linear";
import type { RecursiveJSONable } from "@/shared/util/type_helpers";
import { ok } from "assert";
import { keys, padStart } from "lodash";
import { performance as perfHooksPerformance } from "perf_hooks";
import UAParser from "ua-parser-js";

export function choose<T>(items: T[], seed: number) {
  return items[Math.floor(Math.abs(seed)) % items.length];
}

export function any<T>(items: Array<T>, predicate: (a: T) => boolean): boolean {
  for (const item of items) {
    if (predicate(item)) {
      return true;
    }
  }
  return false;
}

export function all<T>(items: Array<T>, predicate: (a: T) => boolean): boolean {
  for (const item of items) {
    if (!predicate(item)) {
      return false;
    }
  }
  return true;
}

export function weightedRandomIndex(weights: number[]): number {
  const weightTotal = weights.reduce((acc, weight) => acc + weight, 0);
  let choice = Math.random() * weightTotal;
  for (let i = 0; i < weights.length; ++i) {
    const weight = weights[i];
    if (choice > weight) {
      choice -= weight;
      continue;
    }
    return i;
  }
  // This should be covered above, only floating point imprecision might lead
  // to here.
  return weights.length - 1;
}

export function getPerformance() {
  return perfHooksPerformance || performance;
}

export function getNowMs() {
  return getPerformance().now();
}

export function clearObjectProperties(a: Record<string, any>) {
  keys(a).forEach((k) => {
    if (a.hasOwnProperty(k)) {
      delete a[k];
    }
  });
}

export function stripLeadingSlash(path: string) {
  return path.replace(/^\//g, "");
}

export function messageFromError(error: any): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof APIError) {
    if (error.message) {
      return `${error.message}`;
    }
    return `API Error ${error.code}`;
  }
  if (error instanceof Error) {
    return error.message;
  }

  return `Error: ${error}`;
}

export function typesafeJSONStringify<T extends RecursiveJSONable<T>>(item: T) {
  return JSON.stringify(item);
}

export function typesafeJSONParse<T extends RecursiveJSONable<T>>(val: string) {
  return JSON.parse(val) as T;
}

export function rowMajorIdx(cols: number, row: number, col: number) {
  return row * cols + col;
}

export function downloadTextFile(filename: string, text: string) {
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

export function dataURLToBase64(dataUrl: string) {
  if (dataUrl === null || typeof dataUrl !== `string`) {
    throw new Error(`Invalid data url response`);
  }
  const base64 = dataUrl.split(`,`)[1];
  return base64;
}

export async function stringSHAHash(input: string) {
  const msgBuffer = new TextEncoder().encode(input);
  let c: typeof crypto;
  if (process.env.IS_SERVER) {
    // Browser has a newer crypto API than node does, this backports it
    const { Crypto } = await require("@peculiar/webcrypto");
    c = new Crypto();
  } else {
    c = crypto;
  }

  // NOTE: the following only works in secure contexts (localhost, https, etc)
  const hashBuffer = await c.subtle.digest("SHA-256", msgBuffer);

  // convert ArrayBuffer to Array
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // convert bytes to hex string
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

export function niceTruncate(str: string, n: number) {
  if (str.length <= n) {
    return str;
  }
  return str.slice(0, n - 1) + "…";
}

export function displayUsername(username: string | undefined, length = 20) {
  if (!username) {
    return "A User";
  }
  return niceTruncate(username, length);
}

export const randomString = (length: number) =>
  Array.from(Array(length), () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join("");

export function dictToQueryString(
  data: Record<string, string | number | boolean | undefined>,
  isRoot?: boolean
) {
  const ret = [];
  for (const d in data) {
    const v = data[d];
    if (v !== undefined) {
      ret.push(encodeURIComponent(d) + "=" + encodeURIComponent(v));
    }
  }
  const andified = ret.join("&");
  if (isRoot) {
    return andified.length > 0 ? `?${andified}` : "";
  } else {
    return andified;
  }
}

export function pathWithQuery(
  path: string,
  data: Record<string, string | number | boolean | undefined>
): string {
  return `${path}${dictToQueryString(data, true)}`;
}

export function trimStringNulls(s: string) {
  return s.replace(/\0/g, "");
}

export function timeString(timeInSeconds: number) {
  const minutes = Math.floor(timeInSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const seconds = Math.round(timeInSeconds % 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}:${padStart((minutes % 60).toString(), 2, "0")}:${padStart(
      seconds.toString(),
      2,
      "0"
    )}`;
  } else {
    return `${minutes}:${padStart(seconds.toString(), 2, "0")}`;
  }
}

export function shortTimeString(timeInSeconds: number) {
  const minutes = Math.ceil(timeInSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days}d`;
  } else if (hours > 10) {
    return `${hours}h`;
  } else if (hours > 1) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 1) {
    return `${minutes}m`;
  } else {
    return `${Math.round(timeInSeconds)}s`;
  }
}

export function plantTimeString(timeInSeconds: number) {
  const minutes = Math.ceil(timeInSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 7) {
    return `${days}d`;
  } else if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 1) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 1) {
    return `${minutes}m`;
  } else {
    return `${Math.round(timeInSeconds)}s`;
  }
}

export function definedOrThrow<T>(value?: T) {
  ok(value !== undefined);
  return value;
}

export function zeroToUndefined<T extends number>(value?: T): T | undefined {
  return value === 0 ? undefined : value;
}

export function entityPositionOrBoxCenter<V extends ReadonlyVec3f | undefined>(
  entity: ReadonlyEntity | undefined,
  fallback: V
) {
  if (!entity) {
    return fallback;
  }

  if (entity.box) {
    return centerAABB([entity.box.v0, entity.box.v1]);
  } else if (entity.position) {
    return entity.position.v;
  }

  return fallback;
}

export function meetsSignInRequirements(userAgent?: string) {
  if (process.env.IS_SERVER && !userAgent) {
    return true;
  } else {
    userAgent ??= navigator.userAgent;
  }

  const uaParser = new UAParser(userAgent);
  if (uaParser.getDevice().type /* undefined === desktop*/) {
    return false;
  }
  return true;
}
