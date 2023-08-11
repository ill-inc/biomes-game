import { cleanEmitterCallback } from "@/client/util/helpers";
import { zBiomesId } from "@/shared/ids";
import EventEmitter from "events";
import { useEffect, useState } from "react";
import type TypedEventEmitter from "typed-emitter";
import * as z from "zod";

export const zEntityDrawLimit = z.enum([
  "auto",
  "low",
  "medium",
  "high",
  "tweaks",
]);
export type EntityDrawLimit = z.infer<typeof zEntityDrawLimit>;

export const zDrawDistance = z.enum([
  "dynamic",
  "veryLow",
  "low",
  "medium",
  "high",
]);
export type DrawDistance = z.infer<typeof zDrawDistance>;

export const zComputedRenderScale = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("dynamic"),
    scale: z.number().optional(),
  }),
  z.object({
    kind: z.literal("scale"),
    scale: z.number(),
  }),
  z.object({
    kind: z.literal("resolution"),
    res: z.tuple([z.number(), z.number()]),
  }),
]);
export type ComputedRenderScale = z.infer<typeof zComputedRenderScale>;
export const zRenderScale = z.union([
  zComputedRenderScale,
  z.object({
    kind: z.literal("retina"),
  }),
  z.object({
    kind: z.literal("native"),
  }),
]);
export type RenderScale = z.infer<typeof zRenderScale>;

export const zGraphicsQuality = z.enum([
  "auto",
  "low",
  "high",
  "custom",
  "safeMode",
]);
export type GraphicsQuality = z.infer<typeof zGraphicsQuality>;

// In the future, can add more AA like FXAA, TAA
export const zPostprocessAA = z.enum(["none", "smaa"]);
export type PostprocessAA = z.infer<typeof zPostprocessAA>;

// In the future, can add more SSAO like GTAO, HBAO
export const zPostprocessSSAO = z.enum(["none", "ssao"]);
export type PostprocessSSAO = z.infer<typeof zPostprocessSSAO>;

export const zPostprocessDebug = z.enum([
  "none",
  "normal",
  "depth",
  "secondarycolor",
  "texture",
  "skyColorDebug",
  "depthPre",
  "depthBase",
]);
export type PostprocessDebug = z.infer<typeof zPostprocessDebug>;

export const zVisibleMapMarker = z.enum([
  "quests",
  "robot",
  "players",
  "mailboxes",
]);
export type VisibleMapMarker = z.infer<typeof zVisibleMapMarker>;

export const zSettings = z.object({
  "settings.language": z.string(),

  "settings.volume": z.number().default(100),
  "settings.volume.music": z.number().default(50),
  "settings.volume.effects": z.number().default(100),
  "settings.volume.media": z.number().default(50),
  "settings.volume.voice": z.number().default(50),

  "inventory.craftByDefault": z.boolean(),

  "settings.mouse.sensitivity": z.number(),
  "settings.mouse.togglePrimaryClick": z.boolean(),
  "settings.mouse.invertY": z.boolean(),
  "settings.mouse.scrollHotbar": z.boolean(),
  "settings.keyboard.toggleRunSwimBool": z.boolean(),
  "settings.keyboard.toggleCrouchBool": z.boolean(),
  "settings.hud.showPerformance": z.boolean(),
  "settings.hud.hideReturnToGame": z.boolean(),
  "settings.hud.keepOverlaysVisible": z.boolean(),
  "settings.hud.hideChrome": z.boolean(),

  "settings.cam.cinematicMode": z.boolean(),
  "settings.cam.printResolution": z.boolean(),

  // Overarching graphics quality setting.
  "settings.graphics.quality": zGraphicsQuality,

  "settings.graphics.postprocessing.aa": zPostprocessAA,
  "settings.graphics.postprocessing.ssao": zPostprocessSSAO,
  "settings.graphics.postprocessing.bloom": z.boolean(),
  "settings.graphics.waterReflection": z.boolean(),
  // Dev-only debugging
  "settings.graphics.postprocessing.debug": zPostprocessDebug,
  // Retina uses display pixel ratio. Native uses raw pixel count. Number is a scale off of native.
  // Auto will dynamically adjust renderscale to hit >60fps.
  "settings.graphics.renderScale": zRenderScale,
  "settings.graphics.drawDistance": zDrawDistance,
  // Max NPCs/Players/Placeables to draw on the screen in one frame.
  "settings.graphics.entityDrawLimit": zEntityDrawLimit,
  "settings.graphics.depthPrePass": z.boolean(),
  // Number of active quests to show in the quest HUD.
  // DEPRECATED: "settings.quest.numberActiveQuestsToShow": zNumberActiveQuestsToShow,
  "settings.map.visibleMarkers": zVisibleMapMarker.array(),
});
export type Settings = z.infer<typeof zSettings>;
export type SettingsKey = keyof Settings;

export const zTypesafeLocalStorageSchema = z
  .object({
    user_id: z.string(),
    lastSoftDeclinePush: z.number(),
    completed_nuxes: z.string(),
    tracked_quest: zBiomesId,
  })
  .merge(zSettings);
export type TypesafeLocalStorageSchema = z.infer<
  typeof zTypesafeLocalStorageSchema
>;

type LocalStorageChangeEvents = {
  [K in keyof TypesafeLocalStorageSchema as `change:${K}`]: (
    val: TypesafeLocalStorageSchema[K]
  ) => void;
};

export const changeEmitter =
  new EventEmitter() as TypedEventEmitter<LocalStorageChangeEvents>;

changeEmitter.setMaxListeners(100);

export function setTypedStorageItem<T extends keyof TypesafeLocalStorageSchema>(
  key: T,
  value: TypesafeLocalStorageSchema[T]
): void {
  localStorage.setItem(key, JSON.stringify(value));
  (changeEmitter as EventEmitter).emit(`change:${key}`, value);
}

export function getTypedStorageItem<T extends keyof TypesafeLocalStorageSchema>(
  key: T
): TypesafeLocalStorageSchema[T] | null {
  const val = localStorage.getItem(key);
  const parsed = zTypesafeLocalStorageSchema.shape[key].safeParse(
    val !== null ? JSON.parse(val) : undefined
  );
  return parsed.success ? (parsed.data as TypesafeLocalStorageSchema[T]) : null;
}

export function addTypedStorageChangeListener<
  T extends keyof TypesafeLocalStorageSchema
>(key: T, callback: (changeVal: TypesafeLocalStorageSchema[T]) => unknown) {
  changeEmitter.addListener(`change:${key}`, callback as any);
}

export function removeTypedStorageChangeListener<
  T extends keyof TypesafeLocalStorageSchema
>(key: T, callback: (changeVal: TypesafeLocalStorageSchema[T]) => unknown) {
  changeEmitter.removeListener(`change:${key}`, callback as any);
}

export function useTypedStorageItem<
  T extends keyof TypesafeLocalStorageSchema,
  Default extends TypesafeLocalStorageSchema[T] | null = null
>(
  key: T,
  defaultVal: Default
): [
  TypesafeLocalStorageSchema[T] | Default,
  (val: TypesafeLocalStorageSchema[T]) => void
] {
  const [val, setVal] = useState(getTypedStorageItem(key));
  const setWrapper = (newVal: TypesafeLocalStorageSchema[T]) => {
    setTypedStorageItem(key, newVal);
    setVal(newVal);
  };

  useEffect(() =>
    cleanEmitterCallback(changeEmitter, {
      [`change:${key}`]: (changeVal: TypesafeLocalStorageSchema[T]) => {
        if (changeVal !== val) {
          setVal(changeVal);
        }
      },
    })
  );

  return [val ?? defaultVal, setWrapper];
}
