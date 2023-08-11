import type { TileKey } from "@/shared/map/types";
import { brotliCompress, brotliDecompress, constants } from "zlib";

async function compress(data: Uint8Array): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    brotliCompress(
      data,
      { params: { [constants.BROTLI_PARAM_QUALITY]: 1 } },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
  });
}

async function decompress(data: Uint8Array): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    brotliDecompress(data, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

async function encodeCompact(data: string): Promise<string> {
  const bytes = await compress(Buffer.from(data));
  return Buffer.from(bytes).toString("base64");
}

async function decodeCompact(code: string): Promise<string> {
  const bytes = await decompress(Buffer.from(code, "base64"));
  return Buffer.from(bytes).toString();
}

export async function encodeTileMap(data: Map<TileKey, string>) {
  return encodeCompact(JSON.stringify(Array.from(data.entries())));
}

export async function decodeTileMap(
  blob: string
): Promise<Map<TileKey, string>> {
  return new Map(JSON.parse(await decodeCompact(blob)));
}
