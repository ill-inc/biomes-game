import type { ReadonlyVec3f, ReadonlyVec4f } from "@/shared/ecs/gen/types";

export function numberToRGBA(color: number): ReadonlyVec4f {
  return [
    (0xff000000 & color) >>> 24,
    (0x00ff0000 & color) >>> 16,
    (0x0000ff00 & color) >>> 8,
    (0x000000ff & color) >>> 0,
  ] as const;
}

export function rgbaToNumber(rgba: ReadonlyVec4f): number {
  return (rgba[0] << 24) | (rgba[1] << 16) | (rgba[2] << 8) | rgba[3];
}

export function numberToRGB(color: number): ReadonlyVec3f {
  return [
    (0x00ff0000 & color) >>> 16,
    (0x0000ff00 & color) >>> 8,
    (0x000000ff & color) >>> 0,
  ] as const;
}

export function numberToHex(color: number): string {
  return "#" + ((1 << 24) | color).toString(16).slice(1);
}

export function rgbToNumber(rgb: ReadonlyVec3f): number {
  return (rgb[0] << 16) | (rgb[1] << 8) | (rgb[2] << 8);
}

export function rgbToHtmlHex(rgb: ReadonlyVec3f): string {
  return numberToHex((rgb[0] << 16) | (rgb[1] << 8) | rgb[2]);
}
