import type { BasePassMaterial } from "@/client/game/renderers/base_pass_material";
import type { CSS3DObject } from "@/client/game/renderers/three_ext/css3d";
import type { ItemMeshInstance } from "@/client/game/resources/item_mesh";
import type { ParticleSystem } from "@/client/game/resources/particles";
import type { AnimationSystemState } from "@/client/game/util/animation_system";
import { AnimationSystem } from "@/client/game/util/animation_system";
import type { TimelineMatcher } from "@/client/game/util/timeline_matcher";
import type { BiomesId } from "@/shared/ids";
import type { Vec2 } from "@/shared/math/types";
import type { ImageSizes } from "@/shared/util/urls";
import type { AnimationMixer, Group, Mesh, Object3D } from "three";

export const placeableSystem = new AnimationSystem(
  {
    open: { fileAnimationName: "Open" },
    close: {
      fileAnimationName: "Close",
    },
    idle: {
      fileAnimationName: "TPose",
    },
    play: {
      fileAnimationName: "Play",
    },
  },
  {
    all: {
      re: /(.*)/i,
    },
  }
);

export interface CSS3DState {
  element?: HTMLElement;
}

export interface PictureFrameInfo {
  picturePlane: Mesh;
  pictureMaterial: BasePassMaterial;
  pictureImageSize: ImageSizes;
  pictureComponentVersion: number;
  imageBitmap: ImageBitmap | undefined;
}

export interface SimpleRaceInfo {
  particleSystemState: "none" | "active" | "complete";
}

export interface MountInfo {
  contentsGroup: Group;
  itemMeshInstances: ItemMeshInstance[];
  particleSystem?: ParticleSystem;
}

export interface AnimatedPlaceableMesh {
  placeableId: BiomesId;
  three: Object3D;

  css3d?: CSS3DObject;
  punchthrough?: Object3D;

  manualAnimationUpdate?: (
    mesh: AnimatedPlaceableMesh,
    dt: number,
    globalTime: number
  ) => unknown;
  meshAnimationInfo?: {
    animationMixer: AnimationMixer;
    animationSystem: typeof placeableSystem;
    animationSystemState: AnimationSystemState<typeof placeableSystem>;
    timelineMatcher: TimelineMatcher;
  };
  pictureFrameInfo?: PictureFrameInfo;
  mountContentsInfo?: MountInfo;
  simpleRaceInfo?: SimpleRaceInfo;
  particleSystems?: ParticleSystem[];
  spatialLighting?: Vec2;
  spatialMesh?: Object3D;
  url?: string;
}
