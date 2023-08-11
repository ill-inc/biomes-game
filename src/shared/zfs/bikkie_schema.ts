import type { SchemaPath } from "@/shared/bikkie/schema/biomes";
import type * as z from "zod";

const bikkieSchemaSymbol = Symbol.for("bikkieSchema");

export function withBikkieSchema<T extends z.ZodTypeAny>(
  zod: T,
  schema: string
): T {
  return zod.annotate(bikkieSchemaSymbol, schema);
}

export function getBikkieSchema<T extends z.ZodTypeAny>(zod: T) {
  return zod.annotations?.[bikkieSchemaSymbol] as SchemaPath | undefined;
}
