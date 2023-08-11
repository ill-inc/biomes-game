import type { Flora, FloraSample } from "@/cayley/graphics/florae";
import type { ArrayN, ArrayOf } from "@/cayley/numerics/arrays";
import type { Dim, Val } from "@/cayley/numerics/runtime";
import { fromBytes, toBytes } from "@/cayley/numerics/serde";
import type { CoordByDim, Shape } from "@/cayley/numerics/shapes";
import { assert } from "@/cayley/numerics/util";
import { blobToBytes, bytesToBlob } from "@/client/components/art/common/utils";
import { z } from "zod";

const zArray = z.object({
  shape: z.array(z.number()),
  data: z.string(),
});

const zFloraGrowth = z.union([
  z.literal("none"),
  z.literal("seed"),
  z.literal("sprout"),
  z.literal("flowering"),
  z.literal("adult"),
  z.literal("wilted"),
]);

const zFloraMuck = z.union([
  z.literal("none"),
  z.literal("muck"),
  z.literal("any"),
]);

const zFloraCriteria = z.object({
  growth: zFloraGrowth,
  muck: zFloraMuck.default("any"),
});

const zFloraGeometry = z.object({
  indices: zArray,
  vertices: zArray,
});

const zFloraMaterial = z.object({
  color: zArray,
});

const zFloraMesh = z.object({
  geometry: zFloraGeometry,
  material: zFloraMaterial,
});

const zFloraTransform = z.object({
  scale: z.number(),
  rotate: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  translate: z.tuple([z.number(), z.number(), z.number()]),
});

const zFloraSample = z.object({
  criteria: zFloraCriteria,
  transform: zFloraTransform,
  mesh: zFloraMesh,
});

const zFloraRotation = z.union([
  z.literal("none"),
  z.literal("yaw"),
  z.literal("any"),
]);

const zFloraWind = z.union([
  z.literal("none"),
  z.literal("plant"),
  z.literal("leaf"),
]);
const zFloraAnimation = z.object({
  rotation: zFloraRotation,
  wind: zFloraWind,
});

const zFlora = z.object({
  name: z.string(),
  samples: z.array(zFloraSample),
  animation: zFloraAnimation.default({
    rotation: "none",
    wind: "plant",
  }),
});

type TArray = z.infer<typeof zArray>;
type TFloraGeometry = z.infer<typeof zFloraGeometry>;
type TFloraMaterial = z.infer<typeof zFloraMaterial>;
type TFloraSample = z.infer<typeof zFloraSample>;
export type TFlora = z.infer<typeof zFlora>;

export function loadFlora(config: unknown): Flora {
  const flora = zFlora.parse(config);
  return {
    name: flora.name,
    samples: flora.samples.map(loadSample),
    animation: flora.animation,
  };
}

function loadSample(sample: TFloraSample) {
  return {
    criteria: sample.criteria,
    transform: sample.transform,
    material: loadMaterial(sample.mesh.material),
    geometry: loadGeometry(sample.mesh.geometry),
  };
}

function loadMaterial(material: TFloraMaterial) {
  return {
    color: loadArray(material.color, "U8", 4),
  };
}

function loadGeometry(geometry: TFloraGeometry) {
  return {
    indices: loadArray(geometry.indices, "U16", 2),
    vertices: loadArray(geometry.vertices, "F32", 2),
  };
}

function loadArray<V extends Val, D extends Dim>(
  array: TArray,
  value: V,
  dim: D
) {
  const { shape, data } = array;
  assert(shape.length === dim);
  const ret = fromBytes(value, shape as Shape, blobToBytes(data));
  return ret as ArrayOf<V, CoordByDim<D>>;
}

export function saveFlora(flora: Flora): TFlora {
  return {
    name: flora.name,
    samples: flora.samples.map(saveSample),
    animation: flora.animation,
  };
}

export function saveSample(sample: FloraSample): TFloraSample {
  return {
    criteria: sample.criteria,
    transform: sample.transform,
    mesh: {
      material: saveMaterial(sample.material),
      geometry: saveGeometry(sample.geometry),
    },
  };
}

function saveMaterial(material: FloraSample["material"]) {
  return {
    color: saveArray(material.color),
  };
}

function saveGeometry(geometry: FloraSample["geometry"]) {
  return {
    indices: saveArray(geometry.indices),
    vertices: saveArray(geometry.vertices),
  };
}

function saveArray(array: ArrayN<Val>) {
  return {
    shape: array.shape,
    data: bytesToBlob(toBytes(array)),
  };
}
