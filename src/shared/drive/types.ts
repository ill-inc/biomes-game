import { zAnyBinaryAttribute } from "@/shared/bikkie/schema/binary";
import { z } from "zod";

export const zAsset = z.object({
  id: z.string(), // Google Drive ID
  name: z.string(), // Name of the file within its directory
  path: z.string(), // Path to the folder containing the file
  md5: z.string(), // MD5 of the file
  mime: z.string(), // Mime type of the file
  size: z.number(), // Size of the file in bytes
  modifiedAtMs: z.number(), // Modified time in milliseconds since epoch
  mirrored: zAnyBinaryAttribute.optional(), // Mirrored instance of this asset
});

export type Asset = z.infer<typeof zAsset>;

export const zMirroredAsset = zAsset.extend({
  mirrored: zAnyBinaryAttribute,
});

export type MirroredAsset = z.infer<typeof zMirroredAsset>;

export function fullPath(asset: Asset) {
  return `${asset.path}/${asset.name}`;
}

export function originStringForAsset(asset: Asset): string {
  return `drive:/${fullPath(asset)}:${asset.id}`;
}

const ORIGIN_REGEX = /^drive:\/(.+):(.+)$/;

export function pathFromOrigin(origin: string): string | undefined {
  const match = ORIGIN_REGEX.exec(origin);
  if (!match) {
    return;
  }
  return match[1];
}
