import type { ClientContext } from "@/client/game/context";
import type {
  ClientResourceDeps,
  ClientResourcesBuilder,
} from "@/client/game/resources/types";
import type { RegistryLoader } from "@/shared/registry";
import * as THREE from "three";
import skynoise from "/public/textures/skybox/skynoise.png";
import { mulm4v4, add, interp } from "@/shared/math/linear";
import type { Mat4, Vec3 } from "@/shared/math/types";
import { makeDisposable } from "@/shared/disposable";

export interface SkyParams {
  sunColor: THREE.Color;
  moonColor: THREE.Color;
  sunDirection: THREE.Vector3;
  moonDirection: THREE.Vector3;
  moonDirectionOffset: THREE.Vector3;
  groundOffset: number;
  heightScale: number;
}

function genSkyNoise() {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(skynoise.src);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return makeDisposable(texture, () => {
    texture.dispose();
  });
}

// conversion values from:
// https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.40.9608&rep=rep1&type=pdf
const rgbToLmsrMat: Mat4 = [
  0.31670331, 0.10129085, 0.01451538, 0.01724063, 0.70299344, 0.72118661,
  0.05643031, 0.60147464, 0.08120592, 0.12041039, 0.53416779, 0.40056206, 0, 0,
  0, 0,
];

const lmsToRgbMat: Mat4 = [
  4.57829597, -0.63342362, -0.05749394, 0, -4.48749114, 2.03236026, -0.09275939,
  0, 0.31554848, -0.36183302, 1.90172089, 0, 0, 0, 0, 0,
];

function rgbToLmsr(c: Vec3) {
  return mulm4v4(rgbToLmsrMat, [...c, 0]);
}

function lmsToRgb(c: Vec3): Vec3 {
  const res = mulm4v4(lmsToRgbMat, [...c, 0]);
  return [res[0], res[1], res[2]];
}

// purkinje shift from:
// https://advances.realtimerendering.com/s2021/jpatry_advances2021/index.html
// https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2630540/pdf/nihms80286.pdf
function purkinjeShift(c: Vec3, amount = 0.1) {
  const m = [0.63721, 0.39242, 1.6064];
  const K = 45.0;
  const S = 10.0;
  const k3 = 0.6;
  const k5 = 0.2;
  const k6 = 0.29;
  const rw = 0.139;
  const p = 0.6189;
  const lmsr = rgbToLmsr(c);

  const g = [1.0, 1.0, 1.0].map(
    (_, i) =>
      1.0 /
      Math.sqrt(1.0 + (0.33 / m[i]) * (lmsr[i] + [k5, k5, k6][i] * lmsr[3]))
  );

  const rcGr =
    (K / S) *
    (((1.0 + rw * k3) * g[1]) / m[1] - ((k3 + rw) * g[0]) / m[0]) *
    k5 *
    lmsr[3];
  const rcBy =
    (K / S) *
    ((k6 * g[2]) / m[2] -
      k3 * ((p * k5 * g[0]) / m[0] + ((1.0 - p) * k5 * g[1]) / m[1])) *
    lmsr[3];
  const rcLm =
    K * ((p * g[0]) / m[0] + ((1.0 - p) * g[1]) / m[1]) * k5 * lmsr[3];
  const lmsGain: Vec3 = [
    -0.5 * rcGr + 0.5 * rcLm,
    0.5 * rcGr + 0.5 * rcLm,
    rcBy + rcLm,
  ];
  const rgbGain = lmsToRgb(lmsGain);
  const shifted = add(c, rgbGain);

  return interp(c, shifted, amount);
}

function genColorLut(fn: (c: Vec3) => Vec3, size = 8) {
  const data = new Float32Array(size * size * size * 4);
  let i = 0;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const input: Vec3 = [x / (size - 1), y / (size - 1), z / (size - 1)];
        const output = fn(input);
        data[i++] = output[0];
        data[i++] = output[1];
        data[i++] = output[2];
        data[i++] = 1;
      }
    }
  }
  const texture = new THREE.Data3DTexture(data, size, size, size);
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.FloatType;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return makeDisposable(texture, () => {
    texture.dispose();
  });
}

function genNightLut(_context: ClientContext, deps: ClientResourceDeps) {
  const tweaks = deps.get("/tweaks");
  if (tweaks.night.purkinje === false) {
    return genColorLut((c) => c);
  }
  return genColorLut((c) => purkinjeShift(c, tweaks.night.purkinjeStrength));
}

export async function addSkyResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.addGlobal("/scene/sky_params", {
    sunColor: new THREE.Color(0xffffff),
    moonColor: new THREE.Color(0xfefcd7),
    sunDirection: new THREE.Vector3(0, 0, 1),
    moonDirection: new THREE.Vector3(0, 0, -1),
    moonDirectionOffset: new THREE.Vector3(0, 0, -1),
    groundOffset: 0.0,
    heightScale: 10.0,
  });
  builder.add("/scene/sky_noise", genSkyNoise);
  builder.add("/scene/night_lut", loader.provide(genNightLut));
}
