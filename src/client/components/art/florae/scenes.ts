import type { Flora } from "@/cayley/graphics/florae";
import {
  buildFloraIndex,
  toFloraAtlas,
  toFloraGeometry,
  toFloraSampleTensor,
} from "@/cayley/graphics/florae";
import type { IndexedGeometry } from "@/cayley/graphics/geometry";
import { positionHash } from "@/cayley/graphics/utils";
import type { Array4 } from "@/cayley/numerics/arrays";
import { fillArray } from "@/cayley/numerics/arrays";
import {
  makeThreeGeometry,
  makeThreeMesh,
  makeThreeTextureArray,
} from "@/client/components/art/common/three";
import { makeVoxelsDiffuseMaterial } from "@/gen/client/game/shaders/voxels_diffuse";
import * as THREE from "three";

interface FloraMesh {
  geometry: IndexedGeometry;
  colorMap: Array4<"U8">;
}

export function floraPlanarNoiseMesh(flora: Flora) {
  const mask = fillArray("U32", [12, 12, 12], 0);
  for (let z = 0; z < 12; z += 1) {
    for (let x = 0; x < 12; x += 1) {
      if ((z === 0 && x === 0) || positionHash([x, 0, z]) % 5 == 0) {
        mask.set([z, 4, x], 1);
      }
    }
  }

  const index = buildFloraIndex([flora]);

  return {
    geometry: toFloraGeometry(toFloraSampleTensor(mask, index), index),
    colorMap: toFloraAtlas(index),
  };
}

export function floraPlaneMesh(flora: Flora) {
  const mask = fillArray("U32", [12, 12, 12], 0);
  mask.assign(":,5,:", 1);

  const index = buildFloraIndex([flora]);

  return {
    geometry: toFloraGeometry(toFloraSampleTensor(mask, index), index),
    colorMap: toFloraAtlas(index),
  };
}

export function floraMeshToThree(flora: FloraMesh) {
  const ret = makeThreeMesh(
    makeThreeGeometry(flora.geometry),
    makeVoxelsDiffuseMaterial({
      colorMap: makeThreeTextureArray(flora.colorMap),
    })
  );
  ret.material.side = THREE.DoubleSide;
  return ret;
}
