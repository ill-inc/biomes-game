import type { Array1, Array3, Array4 } from "@/cayley/numerics/arrays";
import { fromBuffer, makeArray } from "@/cayley/numerics/arrays";
import { stack } from "@/cayley/numerics/manipulate";
import type { Coord2 } from "@/cayley/numerics/shapes";
import { assert } from "@/cayley/numerics/util";
import { decode_img, encode_png } from "@/wasm/cayley";

export type EncodedImageData = string | Uint8Array;

export function toPng(pixels: Array3<"U8">) {
  return encode_png(pixels.wasm());
}

export function toTexture(image: EncodedImageData) {
  if (typeof image === "string") {
    image = Buffer.from(image, "base64");
  }
  const array = decode_img(image);
  try {
    const [h, w, c] = array.shape();
    return fromBuffer("U8", [h, w, c], array.view());
  } finally {
    array.free();
  }
}

export function toTextureArray(images: EncodedImageData[]) {
  return stack(images.map((img) => maybeAddAlpha3(toTexture(img))));
}

export function maybeAddAlpha3(pixels: Array3<"U8">) {
  assert([3, 4].includes(pixels.shape[2]));
  if (pixels.shape[2] === 3) {
    return pixels.view().pad([0, 0, 0], [0, 0, 1], 255).eval();
  } else {
    return pixels;
  }
}

export function maybeAddAlpha4(pixels: Array4<"U8">) {
  assert([3, 4].includes(pixels.shape[3]));
  if (pixels.shape[3] === 3) {
    return pixels.view().pad([0, 0, 0, 0], [0, 0, 0, 1], 255).eval();
  } else {
    return pixels;
  }
}

export function padToSize(
  pixels: Array3<"U8">,
  [h, w]: Readonly<Coord2>,
  color: Array1<"U8">
) {
  const y0 = Math.floor((h - pixels.shape[0]) / 2);
  const y1 = y0 + pixels.shape[0];
  const x0 = Math.floor((w - pixels.shape[1]) / 2);
  const x1 = x0 + pixels.shape[1];
  const ret = makeArray("U8", [h, w, color.shape[0]]);
  ret.assign("..", color.reshape([1, 1, color.shape[0]]));
  ret.assign(`${y0}:${y1},${x0}:${x1},:`, pixels);
  return ret;
}
