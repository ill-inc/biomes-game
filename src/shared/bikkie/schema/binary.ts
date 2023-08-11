import { ok } from "assert";
import { memoize } from "lodash";
import type { ZodType, ZodTypeAny } from "zod";
import { z } from "zod";

export type BinaryAttributeType = "png" | "itemMesh" | "vox" | "gltf";

const binaryAttributeType = Symbol.for("biomesBinaryAttributeType");

export interface BinaryAttributeSample {
  key: Record<string, any>;
  value: AnyBinaryAttribute;
}

export interface AnyBinaryAttribute {
  // Origin path, not used typically but for reference/refresh purposes.
  origin?: string;
  // SHA-1 of the contents.
  hash: string;
  // Mime type of the data.
  mime?: string;
  // File extension to use
  ext?: string;
  // Alternative samples for this binary attribute, each sample is identified
  // by arbitrary key-value pairs (typically Bikkie attributes, although we
  // avoid that refernce for recursion reasons)
  samples?: BinaryAttributeSample[];
}

export const zAnyBinaryAttribute = z
  .object({
    origin: z.string().optional(),
    hash: z.string(),
    mime: z.string().optional(),
    ext: z.string().optional(),
    samples: z
      .array(
        z.object({
          key: z.record(z.any()),
          value: z.lazy(memoize(() => zAnyBinaryAttribute)),
        })
      )
      .optional(),
  })
  .annotate(binaryAttributeType, "")
  .default({ hash: "" }) as ZodType<AnyBinaryAttribute>;

export function typedBinaryAttribute(
  type: BinaryAttributeType
): ZodType<AnyBinaryAttribute> {
  return zAnyBinaryAttribute.annotate(binaryAttributeType, type);
}

export function isAnyBinaryAttribute(
  zod: ZodTypeAny
): zod is ZodType<AnyBinaryAttribute> {
  return zod.annotations?.[binaryAttributeType] !== undefined;
}

export function isBinaryAttributeFor(
  zod: ZodTypeAny,
  type: BinaryAttributeType
): boolean {
  return zod.annotations?.[binaryAttributeType] === type;
}

export function getBinaryAttributeType(zod: ZodTypeAny): string {
  const type = zod.annotations?.[binaryAttributeType];
  ok(type !== undefined);
  return type;
}

const MISSING_BINARY_PATH = "404.html";

// GCS path for binary data in the assets / bikkie bucket.
export function gcsPathForAttribute(attribute: AnyBinaryAttribute): string {
  // Lets not stick them all in one folder, so break it up a little.
  const hash = attribute.hash;
  if (!hash) {
    return MISSING_BINARY_PATH;
  }
  ok(hash.length > 2);
  const prefix = hash.slice(0, 2);
  // This logic seems silly, but avoids "/ad/" in the URI which some adblockers
  // detect and block.
  return `assets/${prefix === "ad" ? "da" : prefix}/${hash}${
    attribute.ext ? `.${attribute.ext}` : ""
  }`;
}

export function allPathsForAttribute(attribute: AnyBinaryAttribute): string[] {
  const paths = [gcsPathForAttribute(attribute)];
  if (attribute.samples) {
    for (const { value } of attribute.samples) {
      paths.push(...allPathsForAttribute(value));
    }
  }
  return paths.filter((path) => path !== MISSING_BINARY_PATH);
}

export function staticUrlForAttribute(attribute: AnyBinaryAttribute): string {
  return `${
    process.env.BIKKIE_STATIC_PREFIX || "https://static.biomes.gg/"
  }${gcsPathForAttribute(attribute)}`;
}
