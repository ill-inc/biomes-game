import type { PaletteOption } from "@/galois/assets/color_palettes";
import {
  getColorEntry,
  paletteReplaceRange,
} from "@/galois/assets/color_palettes";
import type { CharacterWearable } from "@/galois/assets/wearables_list";
import * as l from "@/galois/lang";
import { CharacterWearableSlotIds } from "@/shared/asset_defs/wearables_list";
import { compact } from "lodash";

type SkeletonData = [string, SkeletonData[]];
export const characterSkeletonData: [string, SkeletonData[]] = [
  "Armature",
  [
    [
      "Chest",
      [
        ["Head", []],
        ["L_Arm", [["L_Forearm", [["L_Hand", []]]]]],
        ["R_Arm", [["R_Forearm", [["R_Hand", [["Tool", []]]]]]]],
      ],
    ],
    [
      "Waist",
      [
        ["L_Thigh", [["L_Leg", [["L_Foot", []]]]]],
        ["R_Thigh", [["R_Leg", [["R_Foot", []]]]]],
      ],
    ],
  ],
];
export const characterSkeleton = l.toSkeleton(characterSkeletonData);

const jointOrdering: string[] = [
  "Head",
  "L_Foot",
  "R_Foot",
  "L_Hand",
  "R_Hand",
  "Waist",
  "Chest",
  "L_Forearm",
  "R_Forearm",
  "L_Leg",
  "R_Leg",
  "L_Arm",
  "R_Arm",
  "L_Thigh",
  "R_Thigh",
];

// We strip mesh node names because upstream when threejs loads the GLTF,
// it will de-duplicate node names by adding `_1` to the end of some of them.
// While the output is self-consistent, it's a problem if we want to then merge
// the animations into another GLTF where the node names are expected to match
// up. Thus, strip the mesh node names (and keep the joint node names) to avoid
// any ambiguity.
export const characterAnimationsGltf = l.StripMeshNodeNamesFromGLTF(
  l.LoadGLTF("animations/character-animations.gltf")
);

// We expect the intial pose to be the T pose, and extract it here since
// we will use it as a reference pose for lining up with the mesh later.
const tPose = l.ExtractInitialPose(characterAnimationsGltf, characterSkeleton);

// TODO(top): Make all this sane by immediately converting everything into
//            a common coordinate space, like the biomes coordinate space.
//            Could even just require things like the Blender-sourced animations
//            to be specified in Biomes space.  Right now we're converting from
//            MagicaVoxel-space to some arbitrary space that the Blender
//            animations are defined in, and then converting from under both
//            of those out to Biomes space for the item attachments.

// Scale down from voxel-space (1 unit = 1 voxel) to pose/animation space.
const VOX_TO_POSE_SCALE: number = 0.1;

// Transforms the vox image data into the coordinate space that is
// used to define animations.
const posedVoxTransformToAnimationCoords: l.GLTFTransformLike = [
  [0, 0, 0.05],
  [-0.7071068, 0, 0, 0.7071068],
  [VOX_TO_POSE_SCALE, VOX_TO_POSE_SCALE, VOX_TO_POSE_SCALE],
];

const POSE_TO_WORLD_SCALE: number = 0.3;

// Convert from the coordinate space that the animations are defined
// within to the coordinate space that the game is looking for.
const transformFromPoseToGame = l.AffineFromList([
  l.AffineFromScale([
    POSE_TO_WORLD_SCALE,
    POSE_TO_WORLD_SCALE,
    POSE_TO_WORLD_SCALE,
  ]),
  l.AffineFromAxisRotation([0, 1, 0], 90),
]);

// Converts from the coordinate system within the animation pose attachment
// point to the biomes coordinate space where items are positioned.
const toolAttachmentPointTransform = l.AffineFromList([
  // Rotate so that equippable +y direction is coming up out of hand.
  l.AffineFromAxisRotation([0, 1, 0], -90),
  l.AffineFromScale([VOX_TO_POSE_SCALE, VOX_TO_POSE_SCALE, VOX_TO_POSE_SCALE]),
]);

const characterWearableSlotSchema = l.toWearableSlotSchema(
  ["base", ...CharacterWearableSlotIds.map((x) => x)] // Convert readonly -> mutable
);

export const PRIMARY_ITEM_COLOR_ICON_REMOVED_PALETTE_RANGE = [1, 9];

export function LoadWearableFromVox(wearableDef: CharacterWearable) {
  let vox = l.LoadVox(wearableVoxFilePath(wearableDef));

  if (wearableDef.palette) {
    vox = l.ReplacePaletteEntries(
      ...paletteReplaceRange("color_palettes/item_materials"),
      getColorEntry({
        paletteId: "color_palettes/item_materials",
        colorId: wearableDef.palette,
      }),
      vox
    );
  }

  return vox;
}

function voxWithCharacterAppearancePaletteTransforms(
  vox: l.GeneralNode<"Vox">,
  primaryColorId:
    | PaletteOption<"color_palettes/item_primary_colors">
    | undefined,
  skinColorId: PaletteOption<"color_palettes/skin_colors">,
  eyeColorId: PaletteOption<"color_palettes/eye_colors">,
  hairColorId: PaletteOption<"color_palettes/hair_colors">
) {
  // Apply some palette transforms to the Vox file according to character
  // appearance settings.
  vox = l.ReplacePaletteEntries(
    ...paletteReplaceRange("color_palettes/eye_colors"),
    getColorEntry({
      paletteId: "color_palettes/eye_colors",
      colorId: eyeColorId,
    }),
    vox
  );
  vox = l.ReplacePaletteEntries(
    ...paletteReplaceRange("color_palettes/skin_colors"),
    getColorEntry({
      paletteId: "color_palettes/skin_colors",
      colorId: skinColorId,
    }),
    vox
  );
  vox = l.ReplacePaletteEntries(
    ...paletteReplaceRange("color_palettes/hair_colors"),
    getColorEntry({
      paletteId: "color_palettes/hair_colors",
      colorId: hairColorId,
    }),
    vox
  );
  if (primaryColorId) {
    vox = l.ReplacePaletteEntries(
      ...paletteReplaceRange("color_palettes/item_primary_colors"),
      getColorEntry({
        paletteId: "color_palettes/item_primary_colors",
        colorId: primaryColorId,
      }),
      vox
    );
  }

  return vox;
}

function characterWearable(
  wearableDef: CharacterWearable,
  primaryColorId:
    | PaletteOption<"color_palettes/item_primary_colors">
    | undefined,
  skinColorId: PaletteOption<"color_palettes/skin_colors">,
  eyeColorId: PaletteOption<"color_palettes/eye_colors">,
  hairColorId: PaletteOption<"color_palettes/hair_colors">
) {
  const vox = voxWithCharacterAppearancePaletteTransforms(
    LoadWearableFromVox(wearableDef),
    primaryColorId,
    skinColorId,
    eyeColorId,
    hairColorId
  );

  return l.toWearable([
    wearableDef.slot,
    l.ToPosedVoxJointMapFromVoxLayers(vox, characterSkeleton),
  ]);
}

function makeBaseWearable(
  skinColorId: PaletteOption<"color_palettes/skin_colors">,
  eyeColorId: PaletteOption<"color_palettes/eye_colors">,
  hairColorId: PaletteOption<"color_palettes/hair_colors">
) {
  const baseModel = voxWithCharacterAppearancePaletteTransforms(
    l.LoadVox("wearables/base_model.vox"),
    undefined,
    skinColorId,
    eyeColorId,
    hairColorId
  );
  return l.toWearable([
    "base",
    l.ToPosedVoxJointMapFromVoxLayers(baseModel, characterSkeleton),
  ]);
}

function wearableVoxFilePath(wearableDef: CharacterWearable) {
  return wearableDef.name.startsWith("data:")
    ? wearableDef.name
    : `${wearableDef.baseName || wearableDef.name}.vox`;
}

export type WearableDescriptor = {
  assetPath?: string;
  definition?: CharacterWearable;
  primaryColor?: PaletteOption<"color_palettes/item_primary_colors">;
};

export type WearableParams = {
  wearableDescriptors: WearableDescriptor[];
  skinColorId?: PaletteOption<"color_palettes/skin_colors">;
  eyeColorId?: PaletteOption<"color_palettes/eye_colors">;
  hairColorId?: PaletteOption<"color_palettes/hair_colors">;
  includeAnimations?: string[];
};

export function extractCharacterAnimation(
  sourceName: string,
  destinationName?: string
) {
  if (destinationName == undefined) {
    destinationName = sourceName;
  }
  return l.ExtractAnimation(
    destinationName,
    sourceName,
    characterAnimationsGltf,
    characterSkeleton
  );
}

export function posedVoxJointMapFromWearableParams({
  wearableDescriptors,
  skinColorId = "skin_color_3",
  eyeColorId = "eye_color_0",
  hairColorId = "hair_color_8",
}: WearableParams) {
  return l.ToPosedVoxJointMapFromWearables(
    characterWearableSlotSchema,
    compact([
      makeBaseWearable(skinColorId, eyeColorId, hairColorId),
      ...wearableDescriptors.map(({ definition, primaryColor }) => {
        if (!definition) {
          return;
        }
        return characterWearable(
          definition,
          primaryColor,
          skinColorId,
          eyeColorId,
          hairColorId
        );
      }),
    ])
  );
}

export function animatedcharacterMeshFromWearables(
  wearableParams: WearableParams
) {
  const accumulatedPosedVoxJointMap =
    posedVoxJointMapFromWearableParams(wearableParams);

  let gltf = l.ToGLTF(
    l.ToSkinnedMeshJointMap(
      accumulatedPosedVoxJointMap,
      tPose,
      posedVoxTransformToAnimationCoords, // Needed to align the .vox content with the tPose.
      jointOrdering
    ),
    tPose,
    wearableParams.includeAnimations
      ? wearableParams.includeAnimations.map((e) =>
          extractCharacterAnimation(e)
        )
      : []
  );
  gltf = l.AddNodeToGLTF(
    gltf,
    "Equipped_Attach",
    "Tool",
    toolAttachmentPointTransform
  );

  gltf = l.TransformGLTF(gltf, transformFromPoseToGame);

  return l.ToGLB(gltf);
}

export function getSkeletonJoints(x: [string, SkeletonData[]]): string[] {
  return [x[0], ...x[1].flatMap((y) => getSkeletonJoints(y))];
}

export function getAssets(): Record<string, l.Asset> {
  return {
    "wearables/animations": l.ToGLB(characterAnimationsGltf),
    "wearables/base_wearable": animatedcharacterMeshFromWearables({
      wearableDescriptors: [],
    }),
  };
}
