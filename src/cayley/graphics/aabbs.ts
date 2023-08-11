import type { Array3 } from "@/cayley/numerics/arrays";
import { fromBuffer } from "@/cayley/numerics/arrays";
import { to_quads } from "@/wasm/cayley";

export function toQuads(aabbs: Array3<"F32">) {
  const array = to_quads(aabbs.wasm());
  try {
    const [n, v, d] = array.shape();
    return fromBuffer("F32", [n, v, d], array.view());
  } finally {
    array.free();
  }
}
