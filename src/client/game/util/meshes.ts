import type {
  BiomesMesh,
  CompactMesh,
  GroupedMesh,
} from "@/shared/wasm/types/biomes";
import type {
  BlockGeometryBuffer,
  FloraGeometryBuffer,
  GroupSubMesh,
  WireframeMesh,
} from "@/shared/wasm/types/galois";
import * as THREE from "three";

type Attribute = {
  name: string;
  size: number;
  // If set to true, this attribute will be skipped (but its size will still
  // be taken into account.)
  ignore?: boolean;
};

function addAttributes(
  geometry: THREE.BufferGeometry,
  vbo: THREE.InterleavedBuffer,
  attributes: Attribute[]
) {
  let offset = 0;
  for (const { name, size, ignore } of attributes) {
    if (!ignore) {
      geometry.setAttribute(
        name,
        new THREE.InterleavedBufferAttribute(vbo, size, offset)
      );
    }
    offset += size;
  }
}

export function biomesMeshToBufferGeometry(mesh: BiomesMesh) {
  const geometry = new THREE.BufferGeometry();

  // Populate the vertex array and define the vertex attributes.
  const vbo = new THREE.InterleavedBuffer(mesh.verticesView(), mesh.stride());
  addAttributes(geometry, vbo, [
    { name: "position", size: 3 },
    { name: "normal", size: 3 },
    { name: "texCoord", size: 2 },
    { name: "texIndex", size: 1 },
    { name: "direction", size: 1 },
  ]);

  // Populate the index array.
  geometry.setIndex(new THREE.BufferAttribute(mesh.indicesView(), 1));

  return geometry;
}

export function compactMeshToBufferGeometry(mesh: CompactMesh) {
  const geometry = new THREE.BufferGeometry();

  // Populate the vertex array and define the vertex attributes.
  const vbo = new THREE.InterleavedBuffer(mesh.verticesView(), mesh.stride());
  addAttributes(geometry, vbo, [
    { name: "attrf", size: 1 },
    { name: "colorIndexf", size: 1 },
    { name: "lightIndexf", size: 1 },
  ]);

  // Populate the index array.
  geometry.setIndex(new THREE.BufferAttribute(mesh.indicesView(), 1));

  return geometry;
}

export function groupMeshToBufferGeometry(mesh: GroupedMesh) {
  const geometry = new THREE.BufferGeometry();

  // Populate the vertex array and define the vertex attributes.
  const vbo = new THREE.InterleavedBuffer(mesh.verticesView(), mesh.stride());
  addAttributes(geometry, vbo, [
    { name: "position", size: 3 },
    { name: "normal", size: 3 },
    { name: "uv", size: 2 },
  ]);

  // Populate the index array and define the index groups.
  geometry.setIndex(new THREE.BufferAttribute(mesh.indicesView(), 1));
  for (let i = 0; i < mesh.groups(); i += 1) {
    geometry.addGroup(mesh.starts(i), mesh.counts(i), i);
  }

  return geometry;
}

export function makeBlockBufferGeometry(
  vertices: Float32Array,
  indices: Uint32Array,
  stride: number = 6
) {
  const geometry = new THREE.BufferGeometry();

  // Populate the vertex array and define the vertex attributes.
  const vbo = new THREE.InterleavedBuffer(vertices, stride);
  addAttributes(geometry, vbo, [
    { name: "position", size: 3 },
    { name: "texCoord", size: 2 },
    { name: "direction", size: 1 },
  ]);

  // Populate the index array and define the index groups.
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  return geometry;
}

export function makeBlockBufferGeometryFromBase64(
  vertexData: string,
  indexData: string
) {
  return makeBlockBufferGeometry(
    new Float32Array(
      Uint8Array.from(atob(vertexData), (c) => c.charCodeAt(0)).buffer
    ),
    new Uint32Array(
      Uint8Array.from(atob(indexData), (c) => c.charCodeAt(0)).buffer
    )
  );
}

export function blockGeometryToBufferGeometry(mesh: BlockGeometryBuffer) {
  return makeBlockBufferGeometry(mesh.vertices, mesh.indices, mesh.stride);
}

export function makeFloraBufferGeometry(
  vertices: Float32Array,
  indices: Uint32Array,
  stride: number = 9
) {
  const geometry = new THREE.BufferGeometry();

  // Populate the vertex array and define the vertex attributes.
  const vbo = new THREE.InterleavedBuffer(vertices, stride);
  addAttributes(geometry, vbo, [
    { name: "position", size: 3 },
    { name: "normal", size: 3 },
    { name: "texCoord", size: 2 },
    { name: "texIndex", size: 1 },
    { name: "tensorIndex", size: 1 },
  ]);

  // Populate the index array and define the index groups.
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));

  return geometry;
}

export function makeFloraBufferGeometryFromBase64(
  vertexData: string,
  indexData: string
) {
  return makeFloraBufferGeometry(
    new Float32Array(
      Uint8Array.from(atob(vertexData), (c) => c.charCodeAt(0)).buffer
    ),
    new Uint32Array(
      Uint8Array.from(atob(indexData), (c) => c.charCodeAt(0)).buffer
    )
  );
}

export function floraGeometryToBufferGeometry(mesh: FloraGeometryBuffer) {
  return makeFloraBufferGeometry(mesh.vertices, mesh.indices, mesh.stride);
}

export function makeGroupBufferGeometry(
  vertexData: Float32Array,
  indexData: Uint32Array,
  stride: number = 9
) {
  const geometry = new THREE.BufferGeometry();

  // Populate the vertex array and define the vertex attributes.
  const vbo = new THREE.InterleavedBuffer(vertexData, stride);
  addAttributes(geometry, vbo, [
    { name: "position", size: 3 },
    // Skip the normals, they can be derived by the positions and we want
    // to keep the GLTF size down.
    { name: "normal", size: 3 },
    { name: "uv", size: 2 },
  ]);

  // Populate the index array.
  geometry.setIndex(new THREE.BufferAttribute(indexData, 1));

  return geometry;
}

export function makeGroupBufferGeometryFromBase64(
  vertexData: string,
  indexData: string
) {
  return makeGroupBufferGeometry(
    new Float32Array(
      Uint8Array.from(atob(vertexData), (c) => c.charCodeAt(0)).buffer
    ),
    new Uint32Array(
      Uint8Array.from(atob(indexData), (c) => c.charCodeAt(0)).buffer
    )
  );
}

export function groupGeometryToBufferGeometry(mesh: GroupSubMesh) {
  return makeGroupBufferGeometry(
    mesh.vertices(),
    mesh.indices(),
    mesh.stride()
  );
}

export function wireframeGeometryToBufferGeometry(mesh: WireframeMesh) {
  const geometry = new THREE.BufferGeometry();

  // Populate the vertex array and define the vertex attributes.
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(mesh.vertices(), 3)
  );

  // Populate the index array.
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices(), 1));

  return geometry;
}
