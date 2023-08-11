import type { Array2, Array3 } from "@/cayley/numerics/arrays";
import { assertArray3, fromWasm } from "@/cayley/numerics/arrays";
import type { Coord3 } from "@/cayley/numerics/shapes";
import { Mapping } from "@/wasm/cayley";

export function toAmbientOcclusion(heights: Array2<"I32">) {
  const out = Mapping.to_ao(heights.wasm());
  try {
    const ret = fromWasm("U8", out);
    assertArray3(ret);
    return ret;
  } finally {
    out.free();
  }
}

export function toShadows(
  heights: Array2<"I32">,
  {
    lightDir,
    jitter,
    sampleDistance,
    sampleCount,
  }: {
    lightDir: Readonly<Coord3>;
    jitter: number;
    sampleDistance: number;
    sampleCount: number;
  }
) {
  const out = Mapping.to_shadows(
    heights.wasm(),
    new Float32Array(lightDir),
    jitter,
    sampleDistance,
    sampleCount
  );
  try {
    const ret = fromWasm("U8", out);
    assertArray3(ret);
    return ret;
  } finally {
    out.free();
  }
}

export function renderAlphaMap(alpha: Array3<"U8">, dpi: number) {
  const out = Mapping.render_alpha(alpha.wasm(), dpi);
  try {
    const ret = fromWasm("U8", out);
    assertArray3(ret);
    return ret;
  } finally {
    out.free();
  }
}
