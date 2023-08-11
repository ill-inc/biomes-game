import type { Item, ReadonlyItem } from "@/shared/game/item";
import { zItem } from "@/shared/game/item";
import { zRawItem } from "@/shared/game/raw_item";
import { zBiomesId } from "@/shared/ids";
import { zVec3f } from "@/shared/math/types";
import { zBucketedImageCloudBundle } from "@/shared/url_types";
import { memoize } from "lodash";
import { z } from "zod";

export type ItemAndCount = {
  item: Item;
  count: bigint;
};

export type ReadonlyItemAndCount = {
  readonly item: ReadonlyItem;
  readonly count: bigint;
};

export const zRawItemAndCount = z.object({
  item: zRawItem,
  count: z.bigint(),
});

export const zSerializedItemAndCount = z.object({
  item: z.any(),
  count: z.union([z.string(), z.number()]),
});

export type SerializedItemAndCount = z.infer<typeof zSerializedItemAndCount>;

export type ItemBag = Map<string, ItemAndCount>;
export const zRawItemBag = z.map(z.string(), zRawItemAndCount);

export const zCameraMode = z.enum([
  "normal",
  "selfie",
  "isometric",
  "fps",
  "iso_ne",
  "iso_nw",
  "iso_sw",
  "iso_se",
]);

export type CameraMode = z.infer<typeof zCameraMode>;

export const zNavigationAid = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("position"),
    pos: zVec3f,
  }),
  z.object({
    kind: z.literal("npc"),
    npcTypeId: zBiomesId,
  }),
  z.object({
    kind: z.literal("entity"),
    id: zBiomesId,
  }),
  z.object({
    kind: z.literal("group"),
    groupId: zBiomesId,
  }),
  z.object({
    kind: z.literal("robot"),
  }),

  // TODO: remove when safe
  z.object({
    kind: z.literal("active_campsite"),
  }),
  z.object({
    kind: z.literal("plot"),
    plot: zBiomesId,
  }),
  z.object({
    kind: z.literal("deed"),
    deedId: zBiomesId,
    anchorPosition: zVec3f.optional(),
  }),
]);

export type NavigationAid = z.infer<typeof zNavigationAid>;

export const zTriggerIcon = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({
    kind: z.literal("custom"),
    bundle: zBucketedImageCloudBundle,
  }),
  z.object({
    kind: z.literal("item"),
    item: z.lazy(memoize(() => zItem)),
  }),
]);

export type TriggerIcon = z.infer<typeof zTriggerIcon>;
