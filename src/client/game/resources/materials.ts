import type { ClientContext } from "@/client/game/context";
import breakingAnimation from "@/client/game/resources/breaking_animation.json";
import shapingAnimation from "@/client/game/resources/shaping_animation.json";
import type { ClientResourcesBuilder } from "@/client/game/resources/types";
import { makeColorMapArray } from "@/client/game/util/textures";
import type { RegistryLoader } from "@/shared/registry";
import type * as THREE from "three";

export interface AnimatedMaterial {
  texture: THREE.DataArrayTexture;
  numFrames: number;
}

export interface AnimatingMaterialData {
  shape: [number, number, number, 4];
  blob: string;
}

async function loadAnimatedMaterial(config: AnimatingMaterialData) {
  const data = new Uint8Array(Buffer.from(config.blob, "base64").buffer);
  return {
    texture: makeColorMapArray(data, ...config.shape),
    numFrames: config.shape[0],
  };
}

export function addMaterialsResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.add("/materials/destroying_material", () =>
    loadAnimatedMaterial(breakingAnimation as AnimatingMaterialData)
  );
  builder.add("/materials/shaping_material", () =>
    loadAnimatedMaterial(shapingAnimation as AnimatingMaterialData)
  );
}
