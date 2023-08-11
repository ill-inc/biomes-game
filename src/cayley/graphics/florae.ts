import { IndexedGeometryBuilder } from "@/cayley/graphics/geometry";
import type {
  GenericGeometry,
  GenericMaterial,
  GenericMesh,
  GenericModel,
  GenericNode,
} from "@/cayley/graphics/models";
import { padToSize } from "@/cayley/graphics/textures";
import type { Quaternion } from "@/cayley/graphics/transform";
import { affine, applyTransform } from "@/cayley/graphics/transform";
import { ReservoirSampler, positionRNG, where } from "@/cayley/graphics/utils";
import type { Array2, Array3, Array4, ArrayN } from "@/cayley/numerics/arrays";
import {
  ArrayExpr,
  fillArray,
  fromValues,
  makeArray,
} from "@/cayley/numerics/arrays";
import { concat, stack } from "@/cayley/numerics/manipulate";
import type { Dim, Val } from "@/cayley/numerics/runtime";
import type { Coord3 } from "@/cayley/numerics/shapes";
import { assert, ensure } from "@/cayley/numerics/util";

interface FloraMaterial {
  color: Array4<"U8">;
}

interface FloraGeometry {
  vertices: Array2<"F32">;
  indices: Array2<"U16">;
}

interface FloraTransform {
  scale: number;
  rotate: Quaternion;
  translate: Coord3;
}

export interface FloraCriteria {
  growth: "none" | "wilted" | "seed" | "sprout" | "flowering" | "adult";
  muck: "none" | "muck" | "any";
}

export interface FloraSample {
  criteria: FloraCriteria;
  material: FloraMaterial;
  geometry: FloraGeometry;
  transform: FloraTransform;
}

export interface FloraAnimation {
  rotation: "none" | "yaw" | "any";
  wind: "none" | "plant" | "leaf";
}

export interface Flora {
  name: string;
  samples: FloraSample[];
  animation: FloraAnimation;
}

type IndexEntry = (FloraSample & { textureOffset: number }) | undefined;

export interface FloraIndex {
  florae: Flora[];
  entries: IndexEntry[];
}

export function buildFloraIndex(florae: Flora[]): FloraIndex {
  const entries: IndexEntry[] = [undefined];

  let textureOffset = 0;
  for (const flora of florae) {
    for (const sample of flora.samples) {
      entries.push({
        ...sample,
        geometry: { ...sample.geometry },
        textureOffset,
      });
      textureOffset += sample.material.color.shape[0];
    }
  }

  // Apply the transformation to each flora.
  for (const entry of entries) {
    if (entry) {
      const { geometry, transform } = entry;
      const mat = affine(
        [transform.scale, transform.scale, transform.scale],
        transform.rotate,
        transform.translate
      );
      geometry.vertices = geometry.vertices.clone();
      geometry.vertices.assign(
        ":,0:3",
        applyTransform(geometry.vertices.slice(":,0:3"), mat)
      );
    }
  }

  return { florae, entries };
}

export function toFloraGeometry(samples: Array3<"U32">, index: FloraIndex) {
  const builder = new IndexedGeometryBuilder();

  // Append the geometry into a single buffer.
  let offset = 0;
  where(samples.view().ne(0).eval(), ([z, y, x]) => {
    const {
      textureOffset,
      geometry: { vertices, indices },
    } = ensure(index.entries[samples.get([z, y, x])]);

    for (let i = 0; i < vertices.shape[0]; i += 1) {
      builder.vertices.push(
        [
          vertices.get([i, 0]) + x,
          vertices.get([i, 1]) + y,
          vertices.get([i, 2]) + z,
        ],
        [vertices.get([i, 3]), vertices.get([i, 4]), vertices.get([i, 5])],
        [vertices.get([i, 6]), vertices.get([i, 7])],
        vertices.get([i, 8]) + textureOffset
      );
    }

    for (let i = 0; i < indices.shape[0]; i += 1) {
      builder.pushTriangle([
        offset + indices.get([i, 0]),
        offset + indices.get([i, 1]),
        offset + indices.get([i, 2]),
      ]);
    }

    // Shift the vertices by
    offset += vertices.shape[0];
  });

  return builder.build();
}

export function toFloraAtlas(index: FloraIndex) {
  const arrays: Array4<"U8">[] = [];
  for (const sample of index.entries) {
    if (sample) {
      arrays.push(sample.material.color);
    }
  }
  if (arrays.length > 0) {
    return concat(arrays);
  } else {
    return makeArray("U8", [0, 0, 0, 4]);
  }
}

export function toFloraSampleTensor(florae: Array3<"U32">, index: FloraIndex) {
  const ret = fillArray("U32", florae.shape, 0);

  let offset = 0;
  const view = florae.view();
  for (const [i, flora] of index.florae.entries()) {
    where(view.eq(i + 1).eval(), ([z, y, x]) => {
      const sampler = new ReservoirSampler<number>(positionRNG([x, y, z]));
      flora.samples.forEach((sample, i) => {
        sampler.push(1 + offset + i);
      });
      ret.set([z, y, x], sampler.pop() ?? 0);
    });
    offset += flora.samples.length;
  }

  return ret;
}

export interface FloraMesh {
  material: FloraMaterial;
  geometry: FloraGeometry;
}

const ATLAS_SIZE = [32, 32] as const;

export function floraMeshFromModel(model: GenericModel): FloraMesh {
  assertFloraModel(model);

  // Read out all of the transformed meshes.
  const meshes: FloraMeshSchema[] = [];
  for (const node of model.nodes) {
    const transform = affine(
      node.transform.scale,
      node.transform.rotate,
      [0, 0, 0]
    );
    for (const mesh of node.meshes) {
      assert(mesh.material.color.shape[2] === 4);
      const { position } = mesh.geometry.vertices;
      position.assign("..", applyTransform(position, transform));
      meshes.push(mesh);
    }
  }

  // Combine material into a single buffer.
  const material = {
    color: stack(
      meshes.map((mesh) =>
        padToSize(
          mesh.material.color,
          ATLAS_SIZE,
          fromValues("U8", [4], [0, 0, 0, 0])
        )
      )
    ),
  };

  // Count the combined number of vertices and indices.
  const vertexCount = meshes.reduce(
    (sum, mesh) => sum + mesh.geometry.vertices.position.shape[0],
    0
  );
  const indexCount = meshes.reduce(
    (sum, mesh) => sum + mesh.geometry.indices.shape[0],
    0
  );

  // Combine vertex arrays and add the material index. We also need to update
  // the geometry to reflect the padded texture sizes within the atlas.
  // TODO: Load and apply the node transform here to re-locate the vertices.
  const geometry = (() => {
    const vStack: Array2<"F32">[] = [];
    const iStack: Array2<"U16">[] = [];

    let offset = 0;
    for (let i = 0; i < meshes.length; i += 1) {
      const { material, geometry } = meshes[i];
      const n = geometry.vertices.position.shape[0];

      let vertices = ArrayExpr.fill("F32", [n, 9]);

      // Copy over the vertex attributes.
      vertices = vertices.merge(":,0:3", geometry.vertices.position);
      vertices = vertices.merge(":,3:6", geometry.vertices.normal);
      vertices = vertices.merge(":,6:8", geometry.vertices.texcoord0);
      vertices = vertices.merge(":,8:9", i);

      // Rescale the texture coordinates to account for the texture padding.
      // TODO: Move this out into textures or some shared place.
      const sh = material.color.shape[0] / ATLAS_SIZE[0];
      const sw = material.color.shape[1] / ATLAS_SIZE[1];
      vertices = vertices.merge(
        ":,6:8",
        vertices
          .slice(":,6:8")
          .sub(0.5)
          .mul(fromValues("F32", [1, 2], [sw, sh]))
          .add(0.5)
      );

      // Append the vertices and the indices for this mesh. We need to re-index
      // the indices to adjust for the already appended vertices
      vStack.push(vertices.eval());
      iStack.push(geometry.indices.view().add(offset).eval());

      offset += n;
    }

    return {
      indices: concat(iStack).reshape([indexCount, 3]),
      vertices: concat(vStack).reshape([vertexCount, 9]),
    };
  })();

  return { material, geometry };
}

// TODO: Replace the type assertion code below with a zod-like schema.

interface FloraModelSchema {
  nodes: FloraNodeSchema[];
}

interface FloraNodeSchema {
  transform: {
    scale: Coord3;
    rotate: Quaternion;
    translate: Coord3;
  };
  meshes: FloraMeshSchema[];
}

interface FloraMeshSchema {
  material: {
    color: Array3<"U8">;
  };
  geometry: {
    vertices: {
      normal: Array2<"F32">;
      position: Array2<"F32">;
      texcoord0: Array2<"F32">;
    };
    indices: Array2<"U16">;
  };
}

function assertFloraModel(
  model: GenericModel
): asserts model is FloraModelSchema {
  assert(model.nodes.every(isFloraNode));
}

function isFloraNode(node: GenericNode): node is FloraNodeSchema {
  return node.meshes.every(isFloraMesh);
}

function isFloraMesh(mesh: GenericMesh): mesh is FloraMeshSchema {
  return isFloraMaterial(mesh.material) && isFloraGeometry(mesh.geometry);
}

function isFloraMaterial(material: GenericMaterial) {
  return isArray(material.color, "U8", 3);
}

function isFloraGeometry(geometry: GenericGeometry) {
  return (
    isArray(geometry.vertices.normal, "F32", 2) &&
    isArray(geometry.vertices.position, "F32", 2) &&
    isArray(geometry.vertices.texcoord0, "F32", 2) &&
    isArray(geometry.indices, "U16", 2)
  );
}

function isArray(array: ArrayN<Val> | undefined, val: Val, dim: Dim) {
  return (
    array !== undefined && array.type === val && array.shape.length === dim
  );
}
