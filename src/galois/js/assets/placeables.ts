import type {
  ColorDescriptor,
  PaletteKey,
} from "@/galois/assets/color_palettes";

import { euler2Quat } from "@/galois/assets/helpers";
import type { ItemMeshProperties } from "@/galois/assets/item_meshes";
import {
  itemMeshFromProperty,
  loadVox,
  namedAffineTransforms,
} from "@/galois/assets/item_meshes";
import * as l from "@/galois/lang";

// Most of our placeable assets are made where the .blend file animations are
// scaled by 1/16th (0.0625) from how they appear in MagicaVoxel. For example,
// a 16x16x16 voxel object in MagicaVoxel would be 1x1x1 in Blender where the
// animations associated with the object are defined.
// This is actually a bit non-standard...  The default MagicaVoxel -> Blender
// export uses a scale of 1/10, and most of our other non-placeable assets
// use 1/10 as the scale. So,
// TODO(luis + top): Change placeable assets to have 1/10 scale, and make that
//                   the expected scale here.
const VOX_TO_WORLD_SCALE = 0.0625;
const DEFAULT_VOX_TO_ANIMATION_SCALE = VOX_TO_WORLD_SCALE;

// Assets are assumed facing z+ (backwards in galois viewer)
// TODO: z- is a more natural order
const voxToAnimationCoordsWithoutScale = [
  [0, 0, 0],
  euler2Quat(-Math.PI / 2, 0, 0),
] as const;

const staticVoxTransform: l.GLTFTransformLike = [
  [0, 0, 0],
  euler2Quat(-Math.PI / 2, 0, 0),
  [VOX_TO_WORLD_SCALE, VOX_TO_WORLD_SCALE, VOX_TO_WORLD_SCALE],
];

function animatedGltf(
  voxPath: string,
  animationsPath: string,
  skeleton: l.Skeleton,
  jointOrdering: string[],
  transform: l.AffineTransformLike,
  animationScale: number,
  color: ColorDescriptor | undefined
) {
  const animationsGltf = l.LoadGLTF(animationsPath);

  const tPose = l.ExtractInitialPose(animationsGltf, skeleton);

  const vox = loadVox(voxPath, color);
  const posedVoxJointMap = l.ToPosedVoxJointMapFromVoxLayers(vox, skeleton);

  const animationTransformWithScale: l.GLTFTransformLike = [
    ...voxToAnimationCoordsWithoutScale,
    [animationScale, animationScale, animationScale],
  ];

  const meshJointMap = l.ToSkinnedMeshJointMap(
    posedVoxJointMap,
    tPose,
    animationTransformWithScale, // Needed to align the .vox content with the tPose.
    jointOrdering
  );

  let gltf = l.ToGLTF(
    meshJointMap,
    tPose,
    l.ExtractAllAnimations(animationsGltf, skeleton)
  );

  if (animationScale !== VOX_TO_WORLD_SCALE) {
    // Now that the vox file has been matched to its animations, we can
    // scale it up to its expected world size.
    const scaleRatio = VOX_TO_WORLD_SCALE / animationScale;
    gltf = l.TransformGLTF(
      gltf,
      l.AffineFromScale([scaleRatio, scaleRatio, scaleRatio])
    );
  }

  return l.TransformGLTF(gltf, transform);
}

function staticGltf(
  voxPath: string,
  transform: l.AffineTransformLike,
  color: ColorDescriptor<PaletteKey> | undefined
) {
  const vox = loadVox(voxPath, color);
  let gltf = l.ToGLTF(vox);
  gltf = l.TransformGLTF(gltf, staticVoxTransform);
  return l.TransformGLTF(gltf, transform);
}

type SkeletonData = [string, SkeletonData[]];
const woodContainerSkeletonData: [string, SkeletonData[]] = [
  "Armature",
  [["Box", [["Cap", []]]]],
];
const woodContainerJointOrdering: string[] = ["Box", "Cap"];
const woodContainerSkeleton = l.toSkeleton(woodContainerSkeletonData);

const doorSkeletonData: [string, SkeletonData[]] = ["Armature", [["Door", []]]];
const doorJointOrdering: string[] = ["Door"];
const doorSkeleton = l.toSkeleton(doorSkeletonData);

const boomboxSkeletonData: [string, SkeletonData[]] = [
  "Armature",
  [["Body", [["Speaker", []]]]],
];
const boomboxJointOrdering: string[] = ["Armature", "Body", "Speaker"];
const boomboxSkeleton = l.toSkeleton(boomboxSkeletonData);

const recordPlayerSkeletonData: [string, SkeletonData[]] = [
  "Armature",
  [["player", [["record", []]]]],
];
const recordPlayerJointOrdering: string[] = ["Armature", "player", "record"];
const recordPlayerSkeleton = l.toSkeleton(recordPlayerSkeletonData);

export type PlaceableEntry = {
  name: string;
  pathName?: string;
  color?: ColorDescriptor;
  animationInfo?: {
    animations?: string;
    skeleton: l.Skeleton;
    jointOrdering: string[];
    animationsScale?: number;
  };
};

export const placeablesList: Readonly<PlaceableEntry[]> = [
  {
    name: "containers/wood_container",
    animationInfo: {
      skeleton: woodContainerSkeleton,
      jointOrdering: woodContainerJointOrdering,
    },
  },
  {
    name: "containers/treasure_chest",
    animationInfo: {
      skeleton: woodContainerSkeleton,
      jointOrdering: woodContainerJointOrdering,
      animationsScale: 0.1,
    },
  },
  {
    name: "doors/birch_door",
    animationInfo: {
      animations: "doors/door_animations",
      skeleton: doorSkeleton,
      jointOrdering: doorJointOrdering,
    },
  },
  {
    name: "doors/branches_door",
    animationInfo: {
      animations: "doors/door_animations",
      skeleton: doorSkeleton,
      jointOrdering: doorJointOrdering,
    },
  },
  {
    name: "doors/oak_door",
    animationInfo: {
      animations: "doors/door_animations",
      skeleton: doorSkeleton,
      jointOrdering: doorJointOrdering,
    },
  },
  {
    name: "doors/rubber_door",
    animationInfo: {
      animations: "doors/door_animations",
      skeleton: doorSkeleton,
      jointOrdering: doorJointOrdering,
    },
  },
  {
    name: "doors/silver_door",
    animationInfo: {
      animations: "doors/door_animations",
      skeleton: doorSkeleton,
      jointOrdering: doorJointOrdering,
    },
  },
  {
    name: "frames/oak_frame_small",
  },
  {
    name: "frames/oak_frame_medium",
  },
  {
    name: "frames/oak_frame_large",
  },
  {
    name: "frames/oak_frame_extralarge",
  },

  {
    name: "frames/silver_frame_small",
  },
  {
    name: "frames/silver_frame_medium",
  },
  {
    name: "frames/silver_frame_large",
  },
  {
    name: "frames/silver_frame_extralarge",
  },
  {
    name: "frames/gold_frame_large",
  },
  {
    name: "frames/gold_frame_extralarge",
  },
  {
    name: "signs/small_oak_sign",
  },
  {
    name: "crafting_stations/log_workbench",
  },
  {
    name: "crafting_stations/oak_tailoring_booth",
  },
  {
    name: "crafting_stations/stone_thermoblaster",
  },
  {
    name: "shop/oak_tray",
  },
  {
    name: "camping/campfire",
  },
  {
    name: "boombox",
    animationInfo: {
      animations: "boombox_animations",
      skeleton: boomboxSkeleton,
      jointOrdering: boomboxJointOrdering,
    },
  },
  {
    name: "record_player",
    animationInfo: {
      animations: "record_player_animations",
      skeleton: recordPlayerSkeleton,
      jointOrdering: recordPlayerJointOrdering,
    },
  },
  {
    name: "mucker_ward",
  },
  {
    name: "arcade_machine",
  },
  {
    name: "minigames/minigame_leaderboard",
  },
  {
    name: "minigames/simple_race_start_flag",
  },
  {
    name: "minigames/simple_race_finish_flag",
  },
  {
    name: "minigames/simple_race_checkpoint",
  },
  {
    name: "minigames/minigame_gates",
  },
  {
    name: "minigames/deathmatch_enter",
  },
  {
    name: "minigames/spleef_spawn",
  },
  {
    name: "minigames/spleef_start_flag",
  },
  {
    name: "minigames/bbox_marker",
  },
  {
    name: "mailbox/mailbox",
  },
  {
    name: "led_panel",
  },
  {
    name: "crafting_stations/stone_thermolite",
  },
  {
    name: "crafting_stations/oak_kitchen",
  },
  {
    name: "runic_stone",
  },
  {
    name: "quests/bag1",
  },
  {
    name: "quests/bag2",
  },
  {
    name: "quests/cargo_crate",
  },
  {
    name: "quests/plate_floor",
  },
  {
    name: "quests/plate_wall",
  },
  {
    name: "quests/tools",
  },
  {
    name: "quests/treasure_chest",
  },
  {
    name: "furniture/bench",
  },
  {
    name: "furniture/table",
  },
  {
    name: "furniture/ttable",
  },
  {
    name: "furniture/fence",
  },
  {
    name: "network_tower",
  },
  {
    name: "comms_tower",
  },
  {
    name: "fish_wall_mount",
  },
] as const satisfies ReadonlyArray<PlaceableEntry>;

export const placeableNamesList = [
  ...placeablesList.map(({ name }) => name),
] as const;
export type PlaceableName = (typeof placeableNamesList)[number];

function basePath(x: PlaceableEntry) {
  return `placeables/${x.pathName ?? x.name}`;
}

function voxPath(x: PlaceableEntry) {
  return `${basePath(x)}.vox`;
}

function jsonPath(x: PlaceableEntry) {
  return `${basePath(x)}.json`;
}

function placeableGltfFromPlaceableEntry(x: PlaceableEntry) {
  const properties = l.LoadItemMeshPropertiesFromJSONOrUseDefault(
    jsonPath(x),
    namedAffineTransforms
  );

  if (x.animationInfo) {
    return animatedGltf(
      voxPath(x),
      `placeables/${x.animationInfo.animations ?? x.name}.gltf`,
      x.animationInfo.skeleton,
      x.animationInfo.jointOrdering,
      l.GetTransform(properties),
      x.animationInfo.animationsScale ?? DEFAULT_VOX_TO_ANIMATION_SCALE,
      x.color
    );
  }

  return staticGltf(voxPath(x), l.GetTransform(properties), x.color);
}

export const placeableGltfEntries: [string, l.GeneralNode<"GLTF">][] =
  placeablesList.map((x) => [x.name, placeableGltfFromPlaceableEntry(x)]);

const itemMeshProperties: ItemMeshProperties[] = placeablesList.map((x) => {
  const properties = l.LoadItemMeshPropertiesFromJSONOrUseDefault(
    jsonPath(x),
    namedAffineTransforms
  );
  return {
    name: x.name,
    voxPath: voxPath(x),
    attachmentTransform: l.GetAttachmentTransform(properties),
    iconSettings: l.GetIconSettings(properties),
    colorPalette: x.color,
  };
});

export const placeablePropertiesByName = new Map(
  itemMeshProperties.map((x) => [x.name, x])
);

function meshEntries(defs: ItemMeshProperties[]) {
  return defs.map((x) => [
    `item_meshes/placeables/${x.name}`,
    itemMeshFromProperty(x),
  ]);
}

export function getAssets(): Record<string, l.Asset> {
  return {
    ...Object.fromEntries(
      placeableGltfEntries.map(([n, a]) => [`placeables/${n}`, a])
    ),
    ...Object.fromEntries([...meshEntries(itemMeshProperties)]),
  };
}
