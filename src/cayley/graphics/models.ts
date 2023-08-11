import type { Cursor } from "@/cayley/graphics/bundle";
import { makeCursor } from "@/cayley/graphics/bundle";
import type { Val } from "@/cayley/numerics/runtime";
import { fromBytes } from "@/cayley/numerics/serde";
import type { Coord } from "@/cayley/numerics/shapes";
import { Model } from "@/wasm/cayley";

export type GenericModel = ReturnType<typeof loadModelFromGltf>;
export type GenericNode = GenericModel["nodes"][number];
export type GenericMesh = GenericNode["meshes"][number];
export type GenericMaterial = GenericMesh["material"];
export type GenericGeometry = GenericMesh["geometry"];

export function loadModelFromGltf(gltf: Uint8Array) {
  const bundle = Model.from_gltf(gltf).bundle();
  try {
    return loadModel(makeCursor(bundle));
  } finally {
    bundle.free();
  }
}

function formatPropertyName(name: string) {
  return name
    .toLowerCase()
    .replace(/[-_][a-z0-9]/g, (group) => group.slice(-1).toUpperCase());
}

// TODO: Replace the parsing code below with a zod-like schema.

function loadModel(cursor: Cursor) {
  const nodes: ReturnType<typeof loadNode>[] = [];
  const nodeCount = cursor.popNumber();
  for (let i = 0; i < nodeCount; i += 1) {
    nodes.push(loadNode(cursor));
  }
  return { nodes };
}

function loadNode(cursor: Cursor) {
  const transform = loadTransform(cursor);
  const meshes: ReturnType<typeof loadMesh>[] = [];
  const meshCount = cursor.popNumber();
  for (let i = 0; i < meshCount; i += 1) {
    meshes.push(loadMesh(cursor));
  }
  return { transform, meshes };
}

function loadTransform(cursor: Cursor) {
  const scale = [
    cursor.popNumber(),
    cursor.popNumber(),
    cursor.popNumber(),
  ] as const;
  const rotate = [
    cursor.popNumber(),
    cursor.popNumber(),
    cursor.popNumber(),
    cursor.popNumber(),
  ] as const;
  const translate = [
    cursor.popNumber(),
    cursor.popNumber(),
    cursor.popNumber(),
  ] as const;
  return { scale, rotate, translate };
}

function loadMesh(cursor: Cursor) {
  return {
    material: loadMaterial(cursor),
    geometry: loadGeometry(cursor),
  };
}

function loadMaterial(cursor: Cursor) {
  const textures: ReturnType<typeof loadTexture>[] = [];
  const textureCount = cursor.popNumber();
  for (let i = 0; i < textureCount; i += 1) {
    textures.push(loadTexture(cursor));
  }
  return Object.fromEntries(textures);
}

function loadTexture(cursor: Cursor) {
  const name = formatPropertyName(cursor.popString());
  const pixels = loadArray(cursor);
  return [name, pixels] as const;
}

function loadGeometry(cursor: Cursor) {
  const attributes: ReturnType<typeof loadAttribute>[] = [];
  const attributesCount = cursor.popNumber();
  for (let i = 0; i < attributesCount; i += 1) {
    attributes.push(loadAttribute(cursor));
  }
  let indices;
  if (cursor.popNumber()) {
    indices = loadArray(cursor);
  }
  return { vertices: Object.fromEntries(attributes), indices };
}

function loadAttribute(cursor: Cursor) {
  const name = formatPropertyName(cursor.popString());
  const array = loadArray(cursor);
  return [name, array] as const;
}

function loadArray(cursor: Cursor) {
  const shape = loadShape(cursor);
  const value = cursor.popString();
  const bytes = cursor.popBuffer();
  return fromBytes(value as Val, shape, bytes);
}

function loadShape(cursor: Cursor) {
  const ret = [];
  const dim = cursor.popNumber();
  for (let i = 0; i < dim; i += 1) {
    ret.push(cursor.popNumber());
  }
  return ret as Coord;
}
