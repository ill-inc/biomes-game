import type { SchemaPath } from "@/shared/bikkie/schema/biomes";
import type { Item } from "@/shared/ecs/extern";
import type { CameraMode } from "@/shared/game/types";
import type { BiomesId } from "@/shared/ids";
import type { ZodType, ZodTypeAny } from "zod";
import { z } from "zod";

export const biomesItemSymbol = Symbol.for("biomesItemSymbol");
export const entityIdSymbol = Symbol.for("bioemsEntityIdSymbol");
export const questGiverSymbol = Symbol.for("biomesQuestGiver");
export const itemIdSymbol = Symbol.for("biomesItemIdSymbol");
export const seedIdSymbol = Symbol.for("biomesSeedIdSymbol");
export const blueprintIdSymbol = Symbol.for("biomesBlueprintIdSymbol");
export const npcTypeIdSsymbol = Symbol.for("biomesNpcTypeId");
export const bagAsStringSymbol = Symbol.for("biomesBagAsStringSymbol");
export const shapeStringSymbol = Symbol.for("biomesShapeStringSymbol");
export const defaultSchemaPathSymbol = Symbol.for(
  "biomesDefaultSchemaPathSymbol"
);
export const cameraModeSymbol = Symbol.for("biomesCameraModeSymbol");
export const minigameIdSymbol = Symbol.for("minigameId");
export const biomesIdSymbol = Symbol.for("biomesIdSymbol");
export const zBagAsString = z.string().annotate(bagAsStringSymbol, true);

export function isItemSchema(schema: ZodTypeAny): schema is ZodType<Item> {
  return !!schema.annotations?.[biomesItemSymbol];
}

export function isBiomesIdSchema(
  schema: ZodTypeAny
): schema is ZodType<BiomesId> {
  return !!schema.annotations?.[biomesIdSymbol];
}

export function defaultBiscuitSchemaPath(
  schema: ZodTypeAny
): SchemaPath | undefined {
  return schema.annotations?.[defaultSchemaPathSymbol];
}

export function isCameraIdSymbol(
  schema: ZodTypeAny
): schema is ZodType<CameraMode> {
  return !!schema.annotations?.[cameraModeSymbol];
}

export function isEntityIdSchema(
  schema: ZodTypeAny
): schema is ZodType<BiomesId> {
  return !!schema.annotations?.[entityIdSymbol];
}

export function isItemIdSchema(
  schema: ZodTypeAny
): schema is ZodType<BiomesId> {
  return !!schema.annotations?.[itemIdSymbol];
}

export function isBlueprintIdSchema(
  schema: ZodTypeAny
): schema is ZodType<BiomesId> {
  return !!schema.annotations?.[blueprintIdSymbol];
}

export function isSeedIdSchema(
  schema: ZodTypeAny
): schema is ZodType<BiomesId> {
  return !!schema.annotations?.[seedIdSymbol];
}

export function isNpcTypeIdSchema(
  schema: ZodTypeAny
): schema is ZodType<BiomesId> {
  return !!schema.annotations?.[npcTypeIdSsymbol];
}

export function isBagAsStringSchema(
  schema: ZodTypeAny
): schema is ZodType<string> {
  return !!schema.annotations?.[bagAsStringSymbol];
}

export function isQuestGiverSchema(
  schema: ZodTypeAny
): schema is ZodType<BiomesId> {
  return !!schema.annotations?.[questGiverSymbol];
}

export function isShapeTypeSchema(
  schema: ZodTypeAny
): schema is ZodType<string> {
  return !!schema.annotations?.[shapeStringSymbol];
}

export function isMinigameIdSchema(
  schema: ZodTypeAny
): schema is ZodType<BiomesId> {
  return !!schema.annotations?.[minigameIdSymbol];
}
