export function assert(condition: boolean) {
  if (!condition) {
    throw new Error(`Assertion failure`);
  }
}

export function assertEqual<T>(src: unknown, dst: T): asserts src is T {
  assert(src === dst);
}

export function ensure<T>(value?: T): T {
  if (value === undefined || value === null) {
    throw new Error(`Assertion failure`);
  }
  return value;
}

export function unreachable(): never {
  throw new Error("Invalid unreachable code");
}

export function mapTuple<T extends any[], R>(
  tuple: T,
  fn: (a: T[number], i: number) => R
) {
  return tuple.map(fn) as { [K in keyof T]: R } & { length: T["length"] };
}
