import type { Array3 } from "@/cayley/numerics/arrays";
import { fromBuffer } from "@/cayley/numerics/arrays";
import { to_lines } from "@/wasm/cayley";

export function toLines(rects: Array3<"F32">) {
  const array = to_lines(rects.wasm());
  try {
    const [n, v, d] = array.shape();
    return fromBuffer("F32", [n, v, d], array.view());
  } finally {
    array.free();
  }
}
