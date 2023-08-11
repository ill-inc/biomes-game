import { isArray, isPlainObject, mapValues } from "lodash";
import { serializeError } from "serialize-error";

export function makeJsonSafe(obj: any): any {
  if (isArray(obj)) {
    return obj.map((inner) => makeJsonSafe(inner));
  }
  if (isPlainObject(obj)) {
    return mapValues(obj, (val) => makeJsonSafe(val));
  }
  if (typeof obj === "bigint") {
    return `${obj}n`;
  } else if (obj instanceof Map) {
    return {
      jsMapRenderedAsObject: makeJsonSafe(Object.fromEntries(obj)),
    };
  } else if (obj instanceof Set) {
    return {
      jsSetRenderedAsArray: Array.from(obj, makeJsonSafe),
    };
  }
  return obj;
}

function safeValueReplacer(key: string, value: any) {
  if (value instanceof Map) {
    return {
      jsMapRenderedAsObject: Object.fromEntries(value),
    };
  } else if (value instanceof Set) {
    return {
      jsSetRenderedAsArray: [...value],
    };
  } else if (value instanceof Error) {
    return serializeError(value);
  } else if (typeof value === "bigint") {
    return `${value}n`;
  } else {
    return value;
  }
}

export function safeStringify(obj: any) {
  return JSON.stringify(obj, safeValueReplacer);
}
