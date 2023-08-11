import * as THREE from "three";

type Attribute = { name: string; size: number };

function addAttributes(
  geometry: THREE.BufferGeometry,
  vbo: THREE.InterleavedBuffer,
  attributes: Attribute[]
) {
  let offset = 0;
  for (const { name, size } of attributes) {
    geometry.setAttribute(
      name,
      new THREE.InterleavedBufferAttribute(vbo, size, offset)
    );
    offset += size;
  }
}

export function makeFloraGeometry(
  vertexData: Float32Array,
  indexData: Uint32Array
) {
  const geometry = new THREE.BufferGeometry();

  // Populate the vertex array and define the vertex attributes.
  const vbo = new THREE.InterleavedBuffer(vertexData, 9);
  addAttributes(geometry, vbo, [
    { name: "position", size: 3 },
    { name: "normal", size: 3 },
    { name: "texCoord", size: 2 },
    { name: "texIndex", size: 1 },
  ]);

  // Populate the index array.
  geometry.setIndex(new THREE.BufferAttribute(indexData, 1));

  return geometry;
}

export function makeFloraGeometryFromBase64(
  vertexData: string,
  indexData: string
) {
  return makeFloraGeometry(
    new Float32Array(
      Uint8Array.from(atob(vertexData), (c) => c.charCodeAt(0)).buffer
    ),
    new Uint32Array(
      Uint8Array.from(atob(indexData), (c) => c.charCodeAt(0)).buffer
    )
  );
}

export function makeBlockGeometry(
  vertexData: Float32Array,
  indexData: Uint32Array
) {
  const geometry = new THREE.BufferGeometry();

  // Populate the vertex array and define the vertex attributes.
  const vbo = new THREE.InterleavedBuffer(vertexData, 6);
  addAttributes(geometry, vbo, [
    { name: "position", size: 3 },
    { name: "texCoord", size: 2 },
    { name: "direction", size: 1 },
  ]);

  // Populate the index array.
  geometry.setIndex(new THREE.BufferAttribute(indexData, 1));

  return geometry;
}

export function makeBlockGeometryFromBase64(
  vertexData: string,
  indexData: string
) {
  return makeBlockGeometry(
    new Float32Array(
      Uint8Array.from(atob(vertexData), (c) => c.charCodeAt(0)).buffer
    ),
    new Uint32Array(
      Uint8Array.from(atob(indexData), (c) => c.charCodeAt(0)).buffer
    )
  );
}

export function makeGroupGeometry(
  vertexData: Float32Array,
  indexData: Uint32Array
) {
  const geometry = new THREE.BufferGeometry();

  // Populate the vertex array and define the vertex attributes.
  const vbo = new THREE.InterleavedBuffer(vertexData, 8);
  addAttributes(geometry, vbo, [
    { name: "position", size: 3 },
    { name: "normal", size: 3 },
    { name: "uv", size: 2 },
  ]);

  // Populate the index array.
  geometry.setIndex(new THREE.BufferAttribute(indexData, 1));

  return geometry;
}

export function makeGroupGeometryFromBase64(
  vertexData: string,
  indexData: string
) {
  return makeGroupGeometry(
    new Float32Array(
      Uint8Array.from(atob(vertexData), (c) => c.charCodeAt(0)).buffer
    ),
    new Uint32Array(
      Uint8Array.from(atob(indexData), (c) => c.charCodeAt(0)).buffer
    )
  );
}

export function makeWireframeGeometry(
  vertexData: Float32Array,
  indexData: Uint32Array
) {
  const geometry = new THREE.BufferGeometry();

  // Populate the vertex array and define the vertex attributes.
  geometry.setAttribute("position", new THREE.BufferAttribute(vertexData, 3));

  // Populate the index array.
  geometry.setIndex(new THREE.BufferAttribute(indexData, 1));

  return geometry;
}

export function makeWireframeGeometryFromBase64(
  vertexData: string,
  indexData: string
) {
  return makeWireframeGeometry(
    new Float32Array(
      Uint8Array.from(atob(vertexData), (c) => c.charCodeAt(0)).buffer
    ),
    new Uint32Array(
      Uint8Array.from(atob(indexData), (c) => c.charCodeAt(0)).buffer
    )
  );
}

export function makeVoxelGeometry(
  vertexData: Float32Array,
  indexData: Uint32Array
) {
  const geometry = new THREE.BufferGeometry();

  // Populate the vertex array and define the vertex attributes.
  const vbo = new THREE.InterleavedBuffer(vertexData, 7);
  addAttributes(geometry, vbo, [
    { name: "position", size: 3 },
    { name: "direction", size: 1 },
    { name: "texCoord", size: 2 },
    { name: "texIndex", size: 1 },
  ]);

  // Populate the index array.
  geometry.setIndex(new THREE.BufferAttribute(indexData, 1));

  return geometry;
}

export function makeVoxelGeometryFromBase64(
  vertexData: string,
  indexData: string
) {
  return makeVoxelGeometry(
    new Float32Array(
      Uint8Array.from(atob(vertexData), (c) => c.charCodeAt(0)).buffer
    ),
    new Uint32Array(
      Uint8Array.from(atob(indexData), (c) => c.charCodeAt(0)).buffer
    )
  );
}
