// Base: BasePass outputting color, normal, depth.
// Secondary: Includes Three and Translucent:
//    Three: For use with any default THREE materials, outputting color, depth
//    Translucent: Any translucent materials, outputting only color
// (These are shared since they have the same outputs)
// Currently, we can't re-use the same color texture map for multiple three webglrendertargets,
// so there is a cost to composite all of these passes together.
// In the future, consider modifying three to allow this, and that will save us some buffers
// and composite perf

import { BasePassMaterial } from "@/client/game/renderers/base_pass_material";
import { PunchthroughMaterial } from "@/client/game/renderers/punchthrough_material";
import { CSS3DObject } from "@/client/game/renderers/three_ext/css3d";
import { log } from "@/shared/logging";
import * as THREE from "three";

export const SCENE_TYPES = [
  "base",
  "three",
  "translucent",
  "water",
  "punchthrough",
  "css",
];
const namedDependencies = [
  "color",
  "baseDepth",
  "viewportSize",
  "normalTexture",
  "fogStart",
  "fogEnd",
  "cameraNear",
  "cameraFar",
  "time",
];
export const dependencyUniforms = [...namedDependencies];
export type DependencyUniform = (typeof dependencyUniforms)[number];

export type SceneDependencies = THREE.Scene & {
  materialDependencies: Map<DependencyUniform, Set<THREE.RawShaderMaterial>>;
};

export type SceneType = (typeof SCENE_TYPES)[number];

export type Scenes = {
  [key in SceneType]: SceneDependencies;
};

export const sceneForMaterial = (material: THREE.Material): SceneType => {
  if ((material as any).sceneType) {
    return (material as any).sceneType as SceneType;
  } else if (material instanceof BasePassMaterial) {
    return "base";
  } else if (material instanceof PunchthroughMaterial) {
    return "punchthrough";
  } else if (material.transparent) {
    return "translucent";
  } else {
    return "three";
  }
};

// TODO cache/memoize
export const scenesForObject = (object: THREE.Object3D): Set<SceneType> => {
  const seenScenes = new Set<SceneType>();
  if ((object as any).sceneType) {
    return new Set([(object as any).sceneType]);
  }
  object &&
    object.traverse((child) => {
      if (child instanceof CSS3DObject) {
        seenScenes.add("css");
      }
      if (child instanceof THREE.Mesh) {
        if (child.material) {
          seenScenes.add(sceneForMaterial(child.material));
        }
      }
    });
  return seenScenes;
};

const addMaterialDependency = (
  scene: SceneDependencies,
  name: DependencyUniform,
  material: THREE.RawShaderMaterial
) => {
  if (!scene.materialDependencies.has(name)) {
    scene.materialDependencies.set(name, new Set());
  }
  scene.materialDependencies.get(name)!.add(material);
};

export const addMaterialDependencies = (
  scene: SceneDependencies,
  object: THREE.Object3D
) => {
  object &&
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.RawShaderMaterial) {
          for (const name of namedDependencies) {
            if (name in child.material.uniforms) {
              addMaterialDependency(scene, name, child.material);
            }
          }
        }
      }
    });
};

export const sceneForObject = (object: THREE.Object3D): SceneType => {
  const seenScenes = scenesForObject(object);
  if (seenScenes.size === 0) {
    return "three";
  } else if (seenScenes.size === 1) {
    return [...seenScenes][0];
  } else {
    log.error(`Object has multiple scenes: ${object.name}`);
    return "three";
  }
};

export const createNewScene = (): SceneDependencies => {
  const scene = new THREE.Scene() as SceneDependencies;
  scene.materialDependencies = new Map();
  return scene;
};

export const createNewScenes = (): Scenes => {
  return {
    base: createNewScene(),
    three: createNewScene(),
    translucent: createNewScene(),
    water: createNewScene(),
    punchthrough: createNewScene(),
    css: createNewScene(),
  };
};

export const combineScenes = (...scenes: SceneDependencies[]) => {
  if (scenes.length === 1) {
    return scenes[0];
  }
  const scene = createNewScene();
  scene.children.push(...scenes);
  for (const childScene of scenes) {
    for (const [name, materials] of childScene.materialDependencies.entries()) {
      if (!scene.materialDependencies.has(name)) {
        scene.materialDependencies.set(name, new Set());
      }
      for (const material of materials) {
        scene.materialDependencies.get(name)!.add(material);
      }
    }
  }
  return scene;
};

export const addToScene = (
  scene: SceneDependencies,
  object: THREE.Object3D
) => {
  scene.add(object);
  addMaterialDependencies(scene, object);
};

export const addToScenes = (scenes: Scenes, object: THREE.Object3D) => {
  const objScenes = scenesForObject(object);
  let sceneName: SceneType = "three";

  if (objScenes.size === 1) {
    sceneName = [...objScenes][0];
  } else if (objScenes.size > 1) {
    log.error(
      `Found mesh with mix of scene types ${object.uuid}: ${[
        ...objScenes,
      ]}. Defaulting to three`
    );
    sceneName = "three";
  }
  addMaterialDependencies(scenes[sceneName], object);
  scenes[sceneName].add(object);
};
