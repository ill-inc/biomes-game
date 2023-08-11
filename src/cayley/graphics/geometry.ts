import { Buffer } from "@/cayley/numerics/buffer";
import type { Coord2, Coord3 } from "@/cayley/numerics/shapes";

export interface VertexAttribute {
  name: string;
  size: number;
  offset: number;
}

export interface VertexGeometry {
  data: Float32Array;
  stride: number;
  attributes: VertexAttribute[];
}

export interface IndexedGeometry {
  vertices: VertexGeometry;
  indices: Uint32Array;
}

const VERTEX_STRIDE = 9;

export class VertexGeometryBuilder {
  constructor(readonly buffer = new Buffer()) {}

  get count() {
    return this.buffer.length / VERTEX_STRIDE / 4;
  }

  pushPosition([x, y, z]: Coord3) {
    this.buffer.pushF32(x);
    this.buffer.pushF32(y);
    this.buffer.pushF32(z);
  }

  pushNormal([x, y, z]: Coord3) {
    this.buffer.pushF32(x);
    this.buffer.pushF32(y);
    this.buffer.pushF32(z);
  }

  pushTexCoord([u, v]: Coord2) {
    this.buffer.pushF32(u);
    this.buffer.pushF32(v);
  }

  pushTexIndex(index: number) {
    this.buffer.pushF32(index);
  }

  push(position: Coord3, normal: Coord3, texCoord: Coord2, texIndex: number) {
    this.pushPosition(position);
    this.pushNormal(normal);
    this.pushTexCoord(texCoord);
    this.pushTexIndex(texIndex);
  }

  build(): VertexGeometry {
    const data = new Uint8Array(this.buffer.length);
    this.buffer.writeTo(data);
    return {
      data: new Float32Array(data.buffer),
      stride: VERTEX_STRIDE,
      attributes: [
        { name: "position", size: 3, offset: 0 },
        { name: "normal", size: 3, offset: 3 },
        { name: "texCoord", size: 2, offset: 6 },
        { name: "texIndex", size: 1, offset: 8 },
      ],
    };
  }
}

export class IndexedGeometryBuilder {
  constructor(
    readonly vertices = new VertexGeometryBuilder(),
    readonly indices = new Buffer()
  ) {}

  pushTriangle([i, j, k]: Coord3) {
    this.indices.pushU32(i);
    this.indices.pushU32(j);
    this.indices.pushU32(k);
  }

  buildIndices() {
    const indices = new Uint8Array(this.indices.length);
    this.indices.writeTo(indices);
    return new Uint32Array(indices.buffer);
  }

  build(): IndexedGeometry {
    return {
      vertices: this.vertices.build(),
      indices: this.buildIndices(),
    };
  }
}

export function buildTriangleIndices(count: number) {
  const builder = new IndexedGeometryBuilder();
  let offset = 0;
  for (let i = 0; i < count; i += 1) {
    builder.pushTriangle([offset + 0, offset + 1, offset + 2]);
    offset += 3;
  }
  return builder.buildIndices();
}

export function buildQuadIndices(count: number) {
  const builder = new IndexedGeometryBuilder();
  let offset = 0;
  for (let i = 0; i < count; i += 1) {
    builder.pushTriangle([offset + 0, offset + 1, offset + 2]);
    builder.pushTriangle([offset + 0, offset + 2, offset + 3]);
    offset += 4;
  }
  return builder.buildIndices();
}
