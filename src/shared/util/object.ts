import type { Falsey } from "lodash";

export function removeUndefinedInPlace<T>(object: T): T {
  for (const key in object) {
    if (object[key as keyof typeof object] === undefined) {
      delete object[key as keyof typeof object];
    }
  }
  return object;
}

export function removeNilishInPlace<T>(object: T): T {
  for (const key in object) {
    if (object[key as keyof typeof object] === null) {
      delete object[key as keyof typeof object];
    }
  }
  return object;
}

export function removeFalsyInPlace<T>(object: T): {
  [K in keyof T]: T[K] extends Falsey ? never : T[K];
} {
  for (const key in object) {
    if (!object[key as keyof typeof object]) {
      delete object[key as keyof typeof object];
    }
  }
  return object as any;
}
