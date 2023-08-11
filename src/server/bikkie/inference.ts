import * as color_palettes from "@/galois/assets/color_palettes";
import { colorPalettesMap } from "@/galois/assets/color_palettes";
import { euler2Quat } from "@/galois/assets/helpers";
import {
  characterSkeletonData,
  getSkeletonJoints,
} from "@/galois/assets/wearables";
import type {
  AssetDataMap,
  GLBData,
  GLTFData,
  GLTFItemMeshData,
  JSONData,
  PNGData,
} from "@/galois/interface/types/data";
import { isError, isSignal } from "@/galois/interface/types/data";
import * as l from "@/galois/lang";
import { buildMap } from "@/galois/server/interface";
import type { BinaryInferenceRuleOutput } from "@/server/bikkie/core";
import { binaryTransformInferenceRule, optional } from "@/server/bikkie/core";
import type { BikkieServerContext } from "@/server/bikkie/main";
import type { AnyInferenceRule } from "@/server/shared/bikkie/bakery";
import type { BinaryStore } from "@/server/shared/bikkie/binary";
import type { BikkieCache } from "@/server/shared/bikkie/cache";
import { BikkieNoCache, BikkieRedisCache } from "@/server/shared/bikkie/cache";
import { colorStringToDescriptor } from "@/server/shared/bikkie/color";
import { connectToRedis } from "@/server/shared/redis/connection";
import type { AnimationInfo } from "@/shared/bikkie/schema/animation";
import { attribs } from "@/shared/bikkie/schema/attributes";
import type { BinaryAttributeSample } from "@/shared/bikkie/schema/binary";
import {
  DEFAULT_ICON_SETTINGS,
  DEFAULT_WEARABLE_ICON_SETTINGS,
  encodeIconSettings,
} from "@/shared/bikkie/schema/icons";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { mapMap } from "@/shared/util/collections";
import { zrpcWebSerialize } from "@/shared/zrpc/serde";
import { ok } from "assert";

const VOX_TO_WORLD_SCALE = 0.0625;

const voxToWorldTransform = l.AffineFromScale([
  VOX_TO_WORLD_SCALE,
  VOX_TO_WORLD_SCALE,
  VOX_TO_WORLD_SCALE,
]);

const itemRotationTransforms: l.AffineTransformLike[] = [
  l.AffineFromAxisRotation([0, 1, 0], 180),
  l.AffineFromAxisRotation([1, 0, 0], -90),
];

const itemMeshTransform = l.AffineFromList([
  ...itemRotationTransforms,
  voxToWorldTransform,
]);

const staticPlaceableMeshTransforms = l.AffineFromList([
  l.AffineFromAxisRotation([1, 0, 0], -90),
]);

const animatedPlaceableMeshTransforms = [
  [0, 0, 0],
  euler2Quat(-Math.PI / 2, 0, 0),
] as const;

function toDataUri(buffer: Buffer) {
  return `data:base64,${buffer.toString("base64")}`;
}

// Load a Vox file to suit in-world representation (i.e. placed, dropped, or in-hand)
function loadVoxForWorld(
  data: Buffer | l.GeneralNode<"Vox">,
  { color, isWearable }: { color?: string; isWearable?: boolean }
) {
  let vox = data instanceof Buffer ? l.LoadVox(toDataUri(data)) : data;
  const colorDescriptor = colorStringToDescriptor(color);
  if (colorDescriptor) {
    vox = l.ReplacePaletteEntries(
      ...color_palettes.paletteReplaceRange(colorDescriptor.paletteId),
      color_palettes.getColorEntry(colorDescriptor),
      vox
    );
  }
  if (isWearable) {
    vox = l.RemovePaletteRangeVoxels(
      ...color_palettes.paletteReplaceRange("color_palettes/skin_colors"),
      vox
    );
    vox = l.SubtractLayerVoxels(vox, "hide_standalone");
    const skeletonLayers = getSkeletonJoints(characterSkeletonData);
    vox = l.FilterLayers(vox, skeletonLayers);
  }
  return vox;
}

async function animatePlacableGltf(
  binaries: BinaryStore,
  vox: l.GeneralNode<"Vox">,
  baseGltf: l.GeneralNode<"GLTF">,
  animationInfo: AnimationInfo
) {
  const animationsGltf = await (async () => {
    if (!animationInfo.animations) {
      return baseGltf;
    }
    const data = await binaries.fetch(animationInfo.animations);
    if (!data || !data.length) {
      log.warn("Failed to load animations, falling back to base GLTF", {
        animationInfo,
      });
      return baseGltf;
    }
    return l.LoadGLTF(toDataUri(data));
  })();
  const skeleton = l.toSkeleton(animationInfo.skeleton);
  const tPose = l.ExtractInitialPose(animationsGltf, skeleton);
  const posedVoxJointMap = l.ToPosedVoxJointMapFromVoxLayers(vox, skeleton);
  const scale = animationInfo.animationsScale ?? VOX_TO_WORLD_SCALE;
  const animationTransformWithScale: l.GLTFTransformLike = [
    ...animatedPlaceableMeshTransforms,
    [scale, scale, scale],
  ];
  const meshJointMap = l.ToSkinnedMeshJointMap(
    posedVoxJointMap,
    tPose,
    animationTransformWithScale, // Needed to align the .vox content with the tPose.
    animationInfo.jointOrdering
  );
  let gltf = l.ToGLTF(
    meshJointMap,
    tPose,
    l.ExtractAllAnimations(animationsGltf, skeleton)
  );
  if (scale !== VOX_TO_WORLD_SCALE) {
    // Now that the vox file has been matched to its animations, we can
    // scale it up to its expected world size.
    const scaleRatio = VOX_TO_WORLD_SCALE / scale;
    gltf = l.TransformGLTF(
      gltf,
      l.AffineFromScale([scaleRatio, scaleRatio, scaleRatio])
    );
  }
  return gltf;
}

function assetDataToInferenceOutput(
  assetData: GLTFData | GLBData | JSONData | GLTFItemMeshData | PNGData
): BinaryInferenceRuleOutput {
  switch (assetData.kind) {
    case "GLTF":
      return {
        data: Buffer.from(assetData.data),
        mime: "model/gltf",
      };
    case "GLB":
      return {
        data: Buffer.from(assetData.data, "base64"),
        mime: "model/gltf",
      };
    case "JSON":
    case "GLTFItemMesh":
      return {
        data: Buffer.from(JSON.stringify(assetData)),
        mime: "application/json",
      };
    case "PNG":
      return {
        data: Buffer.from(assetData.data, "base64"),
        mime: "image/x-png",
      };
  }
}

const WEARABLE_COLOR_PALETTE_KEY = "color_palettes/item_primary_colors";

function computeNeededColors(
  primaryColor: string,
  isWearable?: boolean
): string[] {
  const neededColors = new Set([primaryColor]);
  if (isWearable) {
    for (const option of colorPalettesMap.get(WEARABLE_COLOR_PALETTE_KEY)?.def
      .paletteEntries ?? []) {
      neededColors.add(`${WEARABLE_COLOR_PALETTE_KEY}:${option}`);
    }
  }
  return Array.from(neededColors);
}

async function produceSampledOutput(
  name: string,
  binaries: BinaryStore,
  primaryColor: string,
  assets: Map<string, BinaryInferenceRuleOutput>
) {
  const primary = assets.get(primaryColor);
  ok(primary);
  if (assets.size === 1) {
    return primary;
  }
  const primaryAttribute = await binaries.store(
    `infer:${name}:${primaryColor}`,
    primary.data,
    primary.mime
  );
  const samples: BinaryAttributeSample[] = [];
  await Promise.all(
    mapMap(assets, async ({ data, mime }, color) => {
      if (!color) {
        return; // Skip unnamed colors.
      }
      const attribute = await binaries.store(
        `infer:${name}:${color}`,
        data,
        mime
      );
      if (attribute.hash === primaryAttribute.hash) {
        // Skip it, it's the same as primary anyway.
        return;
      }
      samples.push({
        key: { [String(attribs.paletteColor.id)]: color },
        value: attribute,
      });
    })
  );
  if (samples.length > 0) {
    primary.samples = samples;
  }
  return primary;
}

function makeCachingRule<TInferenceRule extends AnyInferenceRule>(
  cache: BikkieCache,
  rule: TInferenceRule
): TInferenceRule {
  if (!cache || rule.noCache) {
    return rule;
  }
  return {
    ...rule,
    fn: async (context, inputs) => {
      const key = `infer:${CONFIG.bikkieInferenceEpoch}:${
        rule.name
      }:${zrpcWebSerialize(inputs)}`;
      return cache.getOrCompute(key, context.output.type(), async () =>
        rule.fn(context, inputs)
      );
    },
  };
}

export async function registerInferenceRules<C extends BikkieServerContext>(
  loader: RegistryLoader<C>
): Promise<AnyInferenceRule[]> {
  const [assetServer, config] = await Promise.all([
    loader.get("assetServer"),
    loader.get("config"),
  ]);
  const cache =
    config.bikkieCacheMode === "redis"
      ? new BikkieRedisCache(await connectToRedis("bikkie-cache"))
      : new BikkieNoCache();

  // Big overlap with 'Builder' and 'Exporter' from assets/scripts/export.
  // TODO: Move common functionality somewhere (e.g. to AssetServer itself)
  const buildTyped = async <T extends keyof AssetDataMap>(
    asset: l.GeneralNode<T>
  ): Promise<AssetDataMap[T]> => {
    const result = await assetServer.build(asset);
    if (isSignal(result)) {
      throw result;
    } else if (isError(result)) {
      throw new Error(result.info.join(""));
    } else {
      return result as unknown as AssetDataMap[T];
    }
  };

  // TODO: Cleanup typing here to be more automatically inferred?
  // TODO: Break these up into multiple files instead of one uber-list.
  return [
    binaryTransformInferenceRule(
      "renderIcon",
      {
        vox: attribs.vox,
        // TODO: Consolidate icon settings.
        // itemIcon = 128x128 with per-item settings from JSON [rare]
        // wearableIcon = 256x256 with fixed camera/lighting
        // npcIcon = 256x256 with fixed camera/lighting [same as wearable]
        //         - sometimes based on vox, but also on player wearable
        // placableIcon = 256x256 with per-placable settings
        iconSettings: optional(attribs.iconSettings),
        color: optional(attribs.paletteColor),
        isWearable: optional(attribs.isWearable),
        isPlacable: optional(attribs.isPlaceable),
      },
      "vox",
      async ({
        context,
        vox: voxData,
        iconSettings,
        color,
        isWearable,
        isPlacable,
      }) => {
        const iconsForColors = async (colors: string[]) => {
          const vox = l.LoadVox(toDataUri(voxData));
          const iconSettingsNode = l.IconSettingsFromJSON(
            encodeIconSettings(
              iconSettings ??
                (isWearable
                  ? DEFAULT_WEARABLE_ICON_SETTINGS
                  : DEFAULT_ICON_SETTINGS)
            )
          );
          const iconSize: l.PairU16Like =
            isWearable || isPlacable ? [256, 256] : [128, 128];
          const assets = new Map<string, PNGData>(
            (await buildMap(
              assetServer.build.bind(assetServer),
              colors.map((color) => [
                color,
                l.ToPNG(
                  l.RenderVoxMap(
                    l.ToVoxMap(loadVoxForWorld(vox, { color, isWearable })),
                    iconSize,
                    iconSettingsNode
                  )
                ),
              ])
            )) as [string, PNGData][]
          );
          return new Map<string, BinaryInferenceRuleOutput>(
            colors.map((color) => [
              color,
              assetDataToInferenceOutput(assets.get(color)!),
            ])
          );
        };
        color ??= "";
        const neededColors = computeNeededColors(color, isWearable);
        return produceSampledOutput(
          "renderIcon",
          context.binaries,
          color,
          await iconsForColors(neededColors)
        );
      }
    ),
    binaryTransformInferenceRule(
      "itemMesh",
      {
        voxData: attribs.vox,
        color: optional(attribs.paletteColor),
        isWearable: optional(attribs.isWearable),
      },
      "voxData",
      async ({ context, voxData, color, isWearable }) => {
        const meshesForColors = async (colors: string[]) => {
          const rawVox = l.LoadVox(toDataUri(voxData));
          const assets = new Map<string, GLBData>(
            (await buildMap(
              assetServer.build.bind(assetServer),
              colors.map((color) => {
                const vox = loadVoxForWorld(rawVox, { color, isWearable });
                let gltf = l.ToGLTF(vox);
                if (isWearable) {
                  gltf = l.TransformGLTF(
                    gltf,
                    l.AffineFromList([
                      voxToWorldTransform,
                      l.AffineFromAxisRotation([1, 0, 0], -90),
                      l.AffineFromTranslation(l.GetAABBCenter(vox)),
                    ])
                  );
                } else {
                  gltf = l.TransformGLTF(gltf, itemMeshTransform);
                }
                return [color, l.ToGLB(gltf)];
              })
            )) as [string, GLBData][]
          );
          return new Map<string, BinaryInferenceRuleOutput>(
            colors.map((color) => [
              color,
              assetDataToInferenceOutput(assets.get(color)!),
            ])
          );
        };

        color ??= "";
        const neededColors = computeNeededColors(color, isWearable);
        return produceSampledOutput(
          "itemMesh",
          context.binaries,
          color,
          await meshesForColors(neededColors)
        );
      }
    ),
    binaryTransformInferenceRule(
      "placeableMesh",
      {
        voxData: attribs.vox,
        color: optional(attribs.paletteColor),
        isPlaceable: attribs.isPlaceable,
        animationInfo: optional(attribs.animations),
      },
      "voxData",
      async ({ context, voxData, color, animationInfo }) => {
        const vox = loadVoxForWorld(voxData, { color });
        let gltf = l.ToGLTF(vox);

        if (animationInfo) {
          // Uses animatedPlacableMeshTransforms
          gltf = await animatePlacableGltf(
            context.binaries,
            vox,
            gltf,
            animationInfo
          );
        } else {
          gltf = l.TransformGLTF(gltf, staticPlaceableMeshTransforms);
        }
        return assetDataToInferenceOutput(await buildTyped(l.ToGLB(gltf)));
      }
    ),
  ].map((rule) => makeCachingRule(cache, rule));
}
