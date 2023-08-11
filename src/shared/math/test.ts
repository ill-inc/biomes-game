import assert from "assert";

export type AssertNearOptions = { message?: string; tolerance?: number };

export function assertNear(a: number, b: number, options?: AssertNearOptions) {
  assert(
    Math.abs(a - b) < (options?.tolerance ?? 0.000001),
    options?.message ?? `Expected '${a}' to be close to '${b}'.`
  );
}

export function assertNearArray(
  a: number[],
  b: number[],
  options?: AssertNearOptions
) {
  assert(
    a.length === b.length,
    options?.message ?? `Expected '${a} to have the same length as '${b}'`
  );
  for (let i = 0; i < a.length; ++i) {
    assertNear(a[i], b[i], {
      message: options?.message ?? `Expected '${a}' to be near '${b}'.`,
      tolerance: options?.tolerance,
    });
  }
}
