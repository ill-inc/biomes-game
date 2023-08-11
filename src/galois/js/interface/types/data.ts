type Base64Bytes = string;

interface ArrayData<Shape> {
  shape: Shape;
  data: Base64Bytes;
}

interface MapData {
  origin: [number, number, number];
  values: ArrayData<[number, number, number]>;
}

export interface BinaryData {
  kind: "Binary";
  data: string;
}

export interface BlockData {
  kind: "Block";
  info: string;
}

export interface BlockAtlasData {
  kind: "BlockAtlas";
  colors: ArrayData<[number, number, number, 3]>;
  mrea: ArrayData<[number, number, number, 4]>;
  index: ArrayData<[number, number]>;
  unmucked_index: ArrayData<[number, number]>;
}

export interface GlassAtlasData {
  kind: "BlockAtlas";
  colors: ArrayData<[number, number, number, 4]>;
  mrea: ArrayData<[number, number, number, 4]>;
  index: ArrayData<[number, number]>;
}

export interface BlockGeometryBufferData {
  kind: "BlockGeometryBuffer";
  vertices: Base64Bytes;
  indices: Base64Bytes;
}

export interface BlockIndexData {
  kind: "BlockIndex";
  index: { id: number; offsets: number[] }[];
  samples: string[];
}

export interface BlockItemMeshData {
  kind: "BlockItemMesh";
  sample: number;
  vertices: Base64Bytes;
  indices: Base64Bytes;
}

export interface GlassItemMeshData {
  kind: "GlassItemMesh";
  sample: number;
  vertices: Base64Bytes;
  indices: Base64Bytes;
}

export interface BlockMaterialBufferData {
  kind: "BlockMaterialBuffer";
  rank: ArrayData<[number, number]>;
  data: ArrayData<[number, number]>;
}

export interface BlockMeshData {
  kind: "BlockMesh";
  geometry: {
    vertices: Base64Bytes;
    indices: Base64Bytes;
  };
  lighting: {
    rank: ArrayData<[number, number]>;
    data: ArrayData<[number, number]>;
  };
  material: {
    rank: ArrayData<[number, number]>;
    data: ArrayData<[number, number]>;
  };
  atlas: {
    colors: ArrayData<[number, number, number, 3]>;
    mrea: ArrayData<[number, number, number, 4]>;
    index: ArrayData<[number, number]>;
  };
}

export interface GlassMeshData {
  kind: "GlassMesh";
  geometry: {
    vertices: Base64Bytes;
    indices: Base64Bytes;
  };
  lighting: {
    rank: ArrayData<[number, number]>;
    data: ArrayData<[number, number]>;
  };
  material: {
    rank: ArrayData<[number, number]>;
    data: ArrayData<[number, number]>;
  };
  atlas: {
    colors: ArrayData<[number, number, number, 4]>;
    mrea: ArrayData<[number, number, number, 4]>;
    index: ArrayData<[number, number]>;
  };
}

export interface BlockSampleData {
  kind: "BlockSample";
  info: string;
}

export interface BlockShapeData {
  kind: "BlockShape";
  info: string;
}

export interface BlockShapeIndexData {
  kind: "BlockShapeIndex";
  ids: { name: string; id: number }[];
  offsets: number[];
  occlusion_masks: number[];
  quads: string;
  wireframe_meshes: string;
}

export interface BlockShapeTensorData {
  kind: "BlockShapeTensor";
  map: MapData;
}

export interface BlockTensorData {
  kind: "BlockTensor";
  map: MapData;
}

export interface FloraData {
  kind: "Flora";
  info: string;
}

export interface FloraAtlasData {
  kind: "FloraAtlas";
  colors: ArrayData<[number, number, number, 4]>;
}

export interface FloraGeometryBufferData {
  kind: "FloraGeometryBuffer";
  vertices: Base64Bytes;
  indices: Base64Bytes;
}

export interface FloraIndexData {
  kind: "FloraIndex";
  index: { id: number; samples: number[] }[];
  quads: ArrayData<[number, number]>[];
}

export interface FloraItemMeshData {
  kind: "FloraItemMesh";
  sample: number;
  vertices: Base64Bytes;
  indices: Base64Bytes;
}

export interface FloraMeshData {
  kind: "FloraMesh";
  geometry: {
    vertices: Base64Bytes;
    indices: Base64Bytes;
  };
  lighting: {
    rank: ArrayData<[number, number]>;
    data: ArrayData<[number, number]>;
  };
  atlas: {
    colors: ArrayData<[number, number, number, 4]>;
  };
}

export interface FloraSampleData {
  kind: "FloraSample";
  info: string;
}

export interface FloraTensorData {
  kind: "FloraTensor";
  map: MapData;
}

export interface ErrorData {
  kind: "Error";
  info: string[];
}

export interface SignalData {
  kind: "Signal";
  info: "unchanged";
}

export interface GLBData {
  kind: "GLB";
  data: Base64Bytes;
}

export interface GLTFData {
  kind: "GLTF";
  data: string;
}

export interface GLTFItemMeshData {
  kind: "GLTFItemMesh";
  data: GLBData | GLTFData;
  // 4x4 affine matrix in column-major order.
  hand_attachment_transform: number[];
}

export interface GroupSubMeshData {
  vertices: Base64Bytes;
  indices: Base64Bytes;
  texture: ArrayData<[number, number, 3 | 4]>;
}

export interface GroupMeshData {
  kind: "GroupMesh";
  blocks: GroupSubMeshData;
  florae: GroupSubMeshData;
  glass: GroupSubMeshData;
}

export interface WireframeMeshData {
  kind: "WireframeMesh";
  vertices: Base64Bytes;
  indices: Base64Bytes;
}

export type ItemMeshData =
  | BlockItemMeshData
  | GlassItemMeshData
  | FloraItemMeshData
  | GLTFItemMeshData;

export interface LightingBufferData {
  kind: "LightingBuffer";
  rank: ArrayData<[number, number]>;
  data: ArrayData<[number, number]>;
}

export interface WEBMData {
  kind: "WEBM";
  data: Base64Bytes;
}

export interface MaskData {
  kind: "Mask";
  map: MapData;
}

export interface OcclusionTensorData {
  kind: "OcclusionTensor";
  map: MapData;
}

export interface PNGData {
  kind: "PNG";
  data: string;
}

export type MapTextureIndexData = [string, [TextureData[], TextureData[]]][];

export interface SourceFileData {
  kind: "SourceFile";
  extension: string;
  content: string;
}

export interface TerrainMeshData {
  kind: "TerrainMesh";
  block: {
    geometry: {
      vertices: Base64Bytes;
      indices: Base64Bytes;
    };
    lighting: {
      rank: ArrayData<[number, number]>;
      data: ArrayData<[number, number]>;
    };
    material: {
      rank: ArrayData<[number, number]>;
      data: ArrayData<[number, number]>;
    };
    atlas: {
      colors: ArrayData<[number, number, number, 3]>;
      index: ArrayData<[number, number]>;
    };
  };
  flora: {
    geometry: {
      vertices: Base64Bytes;
      indices: Base64Bytes;
    };
    atlas: {
      colors: ArrayData<[number, number, number, 4]>;
    };
  };
  glass: {
    geometry: {
      vertices: Base64Bytes;
      indices: Base64Bytes;
    };
    lighting: {
      rank: ArrayData<[number, number]>;
      data: ArrayData<[number, number]>;
    };
    material: {
      rank: ArrayData<[number, number]>;
      data: ArrayData<[number, number]>;
    };
    atlas: {
      colors: ArrayData<[number, number, number, 4]>;
      index: ArrayData<[number, number]>;
    };
  };
}

export interface TerrainTensorData {
  kind: "TerrainTensor";
  map: MapData;
}

export interface TextureData {
  kind: "Texture";
  data: ArrayData<[number, number, 3 | 4]>;
}

export interface TextureAtlasData {
  kind: "TextureAtlas";
  data: ArrayData<[number, number, number, 3 | 4]>;
}

export interface TransformData {
  kind: "Transform";
  permute: [0 | 1 | 2, 0 | 1 | 2, 0 | 1 | 2];
  reflect: [boolean, boolean, boolean];
  translate: [number, number, number];
}

export interface TypeScriptFileData {
  kind: "TypeScriptFile";
  data: string;
}

export interface VoxelMeshData {
  kind: "VoxelMesh";
  geometry: {
    vertices: string;
    indices: string;
  };
  material: {
    colors: ArrayData<[number, number, number, 3]>;
  };
}

export interface WaterMeshData {
  kind: "WaterMesh";
  geometry: {
    vertices: Base64Bytes;
    indices: Base64Bytes;
  };
  lighting: {
    rank: ArrayData<[number, number]>;
    data: ArrayData<[number, number]>;
  };
}

export interface WaterTensorData {
  kind: "WaterTensor";
  map: MapData;
}

export type JSONObject =
  | number
  | string
  | boolean
  | null
  | JSONObject[]
  | { [key: string]: JSONObject };

export interface JSONData {
  kind: "JSON";
  data: JSONObject;
}

export interface AssetDataMap {
  Binary: BinaryData;
  Block: BlockData;
  BlockAtlas: BlockAtlasData;
  BlockGeometryBuffer: BlockGeometryBufferData;
  BlockIndex: BlockIndexData;
  BlockItemMesh: BlockItemMeshData;
  GlassItemMesh: GlassItemMeshData;
  BlockMaterialBuffer: BlockMaterialBufferData;
  BlockMesh: BlockMeshData;
  GlassMesh: GlassMeshData;
  BlockSample: BlockSampleData;
  BlockShape: BlockShapeData;
  BlockShapeIndex: BlockShapeIndexData;
  BlockShapeTensor: BlockShapeTensorData;
  BlockTensor: BlockTensorData;
  Flora: FloraData;
  FloraAtlas: FloraAtlasData;
  FloraGeometryBuffer: FloraGeometryBufferData;
  FloraIndex: FloraIndexData;
  FloraItemMesh: FloraItemMeshData;
  FloraMesh: FloraMeshData;
  FloraSample: FloraSampleData;
  FloraTensor: FloraTensorData;
  GLB: GLBData;
  GLTF: GLTFData;
  GLTFItemMesh: GLTFItemMeshData;
  GroupMesh: GroupMeshData;
  LightingBuffer: LightingBufferData;
  Mask: MaskData;
  OcclusionTensor: OcclusionTensorData;
  PNG: PNGData;
  Pose: JSONData;
  Skeleton: JSONData;
  SourceFile: SourceFileData;
  TerrainMesh: TerrainMeshData;
  TerrainTensor: TerrainTensorData;
  Texture: TextureData;
  TextureAtlas: TextureAtlasData;
  Transform: TransformData;
  TypeScriptFile: TypeScriptFileData;
  VoxelMesh: VoxelMeshData;
  WaterMesh: WaterMeshData;
  WaterTensor: WaterTensorData;
  WEBM: WEBMData;
  WireframeMesh: WireframeMeshData;
}

export type AssetKind = keyof AssetDataMap;
export type DataOf<S extends AssetKind> = AssetDataMap[S];
export type AssetDataWithKind = AssetDataMap[keyof AssetDataMap];
export type AssetData =
  | JSONObject
  | AssetDataWithKind
  | AssetData[]
  | { [key: string]: AssetData };

export function isError(value: unknown): value is ErrorData {
  return (value as ErrorData)?.kind === "Error";
}

export function isSignal(value: unknown): value is SignalData {
  return (value as SignalData)?.kind === "Signal";
}
