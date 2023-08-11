import { ok } from "assert";

export function makeWasmMemory(memoryMb: number) {
  ok(memoryMb <= 4 * 1024);

  // Seems to be an overflow that occurs if we request to allocate exactly
  // 4GB, so to keep client code simple, just adjust it slightly here.
  memoryMb = Math.min(memoryMb, 4 * 1024 - 1);

  const PAGES_PER_MEGABYTE = 16;
  return new WebAssembly.Memory({
    initial: memoryMb * PAGES_PER_MEGABYTE,
    maximum: memoryMb * PAGES_PER_MEGABYTE,
  });
}
