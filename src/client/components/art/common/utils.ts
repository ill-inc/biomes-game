import { toPng, toTexture } from "@/cayley/graphics/textures";

export function blobToBytes(blob: string): Uint8Array {
  return Buffer.from(blob, "base64");
}

export function bytesToBlob(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString(
    "base64"
  );
}

export function toImgStr(bytes: Uint8Array) {
  return bytesToBlob(bytes);
}

export function toImgUrl(blob: string) {
  return URL.createObjectURL(new Blob([blobToBytes(blob)]));
}

export function toImgBytes(blob: string) {
  return blobToBytes(blob);
}

export function flipImage(bytes: Uint8Array) {
  return toPng(toTexture(bytes).view().flip([true, false, false]).eval());
}
