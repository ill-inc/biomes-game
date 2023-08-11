import { toPng, toTexture } from "@/cayley/graphics/textures";
import type { Array2, Array3 } from "@/cayley/numerics/arrays";
import { ArrayExpr } from "@/cayley/numerics/arrays";
import type { Val } from "@/cayley/numerics/runtime";
import type { TilePos } from "@/shared/map/types";
import assert from "assert";

export function tileParent([u, v]: TilePos): TilePos {
  return [Math.floor(u / 2), Math.floor(v / 2)];
}

export function tileChildren([u, v]: TilePos): [
  TilePos,
  TilePos,
  TilePos,
  TilePos
] {
  return [
    [2 * u, 2 * v],
    [2 * u + 1, 2 * v],
    [2 * u, 2 * v + 1],
    [2 * u + 1, 2 * v + 1],
  ];
}

export function* tileAncestors(tile: TilePos, levels: number) {
  for (let level = 0; level < levels; level += 1) {
    yield [tile, level] as const;
    tile = tileParent(tile);
  }
}

export function downsample(rgb: Array3<"U8">) {
  assert.ok(rgb.shape[0] % 2 == 0);
  assert.ok(rgb.shape[1] % 2 == 0);
  const view = rgb.view().cast("F32");
  const c00 = view.slice(":,:,:").step([2, 2, 1]);
  const c01 = view.slice(":,1:,:").step([2, 2, 1]);
  const c10 = view.slice("1:,:,:").step([2, 2, 1]);
  const c11 = view.slice("1:,1:,:").step([2, 2, 1]);
  return c00.add(c01).add(c10).add(c11).mul(0.25).cast("U8").eval();
}

export function patch2<T extends Val>(
  a00: Array2<T>,
  a01: Array2<T>,
  a10: Array2<T>,
  a11: Array2<T>
) {
  const [h, w] = a00.shape;
  return ArrayExpr.fill(a00.type, [2 * h, 2 * w])
    .merge(`:${h},:${w}`, a00.view())
    .merge(`:${h},${w}:`, a01.view())
    .merge(`${h}:,:${w}`, a10.view())
    .merge(`${h}:,${w}:`, a11.view())
    .eval();
}

export function patch3<T extends Val>(
  a00: Array3<T>,
  a01: Array3<T>,
  a10: Array3<T>,
  a11: Array3<T>
) {
  const [h, w, c] = a00.shape;
  return ArrayExpr.fill(a00.type, [2 * h, 2 * w, c])
    .merge(`:${h},:${w},:`, a00.view())
    .merge(`:${h},${w}:,:`, a01.view())
    .merge(`${h}:,:${w},:`, a10.view())
    .merge(`${h}:,${w}:,:`, a11.view())
    .eval();
}

export function lerp(src: Array3<"U8">, dst: Array3<"U8">, t: number) {
  return src
    .view()
    .cast("F32")
    .mul(1 - t)
    .add(dst.view().cast("F32").mul(t))
    .cast("U8")
    .eval();
}

export class ImageBox {
  constructor(readonly png: Uint8Array) {}

  static fromArray(array: Array3<"U8">) {
    return new ImageBox(toPng(array));
  }

  array() {
    return toTexture(this.png);
  }
}
