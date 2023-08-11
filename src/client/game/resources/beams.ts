import type { ClientContext } from "@/client/game/context";
import type { ClientResourcesBuilder } from "@/client/game/resources/types";
import { makeNoclipBasicTranslucentMaterial } from "@/gen/client/game/shaders/noclip_basic_translucent";
import type { Disposable } from "@/shared/disposable";
import { makeDisposable } from "@/shared/disposable";
import type { Vec3 } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import type { BufferGeometry } from "three";
import { DoubleSide, Mesh, Object3D, PlaneGeometry } from "three";

export type TransientBeam = {
  three: Object3D;
  pos: Vec3;
  expiresAt: number;
  placedAt: number;
  maxHeight: number;
};

export type TransientBeams = {
  beams: Map<string, Disposable<TransientBeam>>;
};

type Color = [number, number, number, number];

export const BEAM_COLOR_HOME = [
  0xe7 / 0xff,
  0xea / 0xff,
  0x3b / 0xff,
  0.75,
] as Color;

export const BEAM_COLOR_QUEST = [
  0xf4 / 0xff,
  0xd0 / 0xff,
  0x27 / 0xff,
  0.75,
] as Color;

export const BEAM_COLOR_PLAYER = [
  0x73 / 0xff,
  0x54 / 0xff,
  0xf0 / 0xff,
  0.75,
] as Color;

export const BEAM_COLOR_NAVIGATION = [
  0xe3 / 0xff,
  0x5f / 0xff,
  0xf5 / 0xff,
  0.75,
] as Color;

export function makeBeamThree(color: Color, width: number = 1) {
  const material = makeNoclipBasicTranslucentMaterial({
    baseColor: color,
  });
  material.depthTest = false;
  material.side = DoubleSide;

  // Create 4 plane sides.

  const ret = new Object3D();

  const p: BufferGeometry[] = new Array(4)
    .fill(undefined)
    .map(() => new PlaneGeometry(width, 1, width, 20));
  p[0].translate(0, 0, width / 2);
  p[1].translate(0, 0, -width / 2);
  p[2].rotateY(Math.PI / 2);
  p[2].translate(width / 2, 0, 0);
  p[3].rotateY(Math.PI / 2);
  p[3].translate(-width / 2, 0, 0);

  const m: Mesh[] = new Array(4)
    .fill(undefined)
    .map((_, i) => new Mesh(p[i], material));
  for (const mesh of m) {
    mesh.frustumCulled = false;
    ret.add(mesh);
  }
  ret.scale.set(1, 1000, 1);
  return makeDisposable(ret, () => {
    for (const plane of p) {
      plane.dispose();
    }
  });
}

export function addBeamResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addGlobal("/scene/beams/transient", {
    beams: new Map(),
  });
  builder.add("/scene/beams/player_mesh", () =>
    makeBeamThree(BEAM_COLOR_PLAYER)
  );
  builder.add("/scene/beams/navigation_mesh", (_dep, _id, beamType) => {
    switch (beamType) {
      case "quest":
        return makeBeamThree(BEAM_COLOR_QUEST);
      default:
      case "placed":
        return makeBeamThree(BEAM_COLOR_NAVIGATION);
    }
  });
}
