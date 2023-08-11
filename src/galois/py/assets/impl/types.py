import struct
from dataclasses import dataclass
from enum import Enum
from hashlib import sha1
from typing import Any, Dict, List, Optional, Tuple, Union

import impl.tensors as t
import numpy as np
import numpy.typing as npt
import pygltflib
from impl.affine_transforms import AffineTransform

from voxeloo import galois as cpp


@dataclass
class LiteralNode:
    kind: str
    data: Union[int, bool, str]

    def __post_init__(self):
        # Compute the node's hash
        object.__setattr__(
            self,
            "hash",
            sha1(f"{self.kind}:{self.data}".encode()).hexdigest(),
        )


@dataclass
class DerivedNode:
    kind: str
    deps: List
    dep_hashes: List[str]

    def __post_init__(self):
        # Compute the node's hash
        object.__setattr__(
            self,
            "hash",
            sha1(
                f"{self.kind}:{':'.join(self.dep_hashes)}".encode()
            ).hexdigest(),
        )


class MaterializationError(ValueError):
    pass


class SerializationError(ValueError):
    pass


def pretty_id(obj: any):
    return f"{obj.__class__.__name__}:{hex(np.uint64(np.int64(hash(obj))))}"


class Axis(Enum):
    X = 0
    Y = 1
    Z = 2

    @classmethod
    def from_str(cls, axis: str):
        return {"x": cls.X, "y": cls.Y, "z": cls.Z}[axis]

    @classmethod
    def from_int(cls, axis: int):
        return {0: cls.X, 1: cls.Y, 2: cls.Z}[axis]

    def float(self):
        return float(self.value)


class Dir(Enum):
    X_NEG = 0
    X_POS = 1
    Y_NEG = 2
    Y_POS = 3
    Z_NEG = 4
    Z_POS = 5

    @classmethod
    def from_str(cls, dir: str):
        return {
            "x_neg": cls.X_NEG,
            "x_pos": cls.X_POS,
            "y_neg": cls.Y_NEG,
            "y_pos": cls.Y_POS,
            "z_neg": cls.Z_NEG,
            "z_pos": cls.Z_POS,
        }[dir]

    @classmethod
    def from_int(cls, dir: int):
        return {
            0: cls.X_NEG,
            1: cls.X_POS,
            2: cls.Y_NEG,
            3: cls.Y_POS,
            4: cls.Z_NEG,
            5: cls.Z_POS,
        }[dir]

    def float(self):
        return float(self.value)


@dataclass(frozen=True)
class ArrayData:
    data: np.ndarray

    def __post_init__(self):
        object.__setattr__(self, "data", self.data.copy(order="C"))
        object.__setattr__(self, "code", sha1(self.data).digest())

    def __eq__(self, other):
        return self.code == other.code

    def __hash__(self):
        return struct.unpack("i", self.code[:4])[0]

    def __str__(self):
        return pretty_id(self)

    def __repr__(self):
        return pretty_id(self)


@dataclass
class Binary:
    data: bytes


@dataclass(frozen=True, eq=True)
class BlockSampleCriteria:
    position: str
    dye: str
    muck: str
    moisture: str


@dataclass(frozen=True, eq=True)
class BlockSample:
    name: str
    criteria: BlockSampleCriteria
    texture: "BlockSampleTexture"


@dataclass(frozen=True, eq=True)
class Glass:
    samples: Tuple[BlockSample]

    def __str__(self):
        return pretty_id(self)

    def __repr__(self):
        return pretty_id(self)


@dataclass(frozen=True, eq=True)
class Block:
    samples: Tuple[BlockSample]

    def __str__(self):
        return pretty_id(self)

    def __repr__(self):
        return pretty_id(self)


@dataclass
class BlockAtlas:
    atlas: "TextureAtlas"
    mreaAtlas: "TextureAtlas"
    index: ArrayData
    unmucked_index: ArrayData


@dataclass(frozen=True)
class BlockGeometryBuffer:
    impl: cpp.shapes.GeometryBuffer


@dataclass
class BlockIndex:
    impl: cpp.blocks.Index
    blocks: List[Block]
    samples: List["BlockSample"]


@dataclass
class GlassIndex:
    impl: cpp.blocks.Index
    blocks: List[Glass]
    samples: List["BlockSample"]


@dataclass
class BlockItemMesh:
    sample: int
    vertices: np.ndarray
    indices: np.ndarray


@dataclass
class GlassItemMesh:
    sample: int
    vertices: np.ndarray
    indices: np.ndarray


@dataclass
class BlockMaterialBuffer:
    impl: cpp.material_properties.MaterialBuffer


@dataclass
class CubeTexture:
    x_neg: "Texture"
    x_pos: "Texture"
    y_neg: "Texture"
    y_pos: "Texture"
    z_neg: "Texture"
    z_pos: "Texture"

    def texture(self, dir: Dir):
        return {
            Dir.X_NEG: self.x_neg,
            Dir.X_POS: self.x_pos,
            Dir.Y_NEG: self.y_neg,
            Dir.Y_POS: self.y_pos,
            Dir.Z_NEG: self.z_neg,
            Dir.Z_POS: self.z_pos,
        }[dir]

    def __str__(self):
        return pretty_id(self)

    def __repr__(self):
        return pretty_id(self)

    def __eq__(self, other):
        return np.all(
            [
                self.x_neg == other.x_neg,
                self.x_pos == other.x_pos,
                self.y_neg == other.y_neg,
                self.y_pos == other.y_pos,
                self.z_neg == other.z_neg,
                self.z_pos == other.z_pos,
            ]
        )

    def __hash__(self):
        return hash(
            (
                self.x_neg,
                self.x_pos,
                self.y_neg,
                self.y_pos,
                self.z_neg,
                self.z_pos,
            )
        )


@dataclass(frozen=True, eq=True)
class BlockSampleTexture:
    color: "CubeTexture"
    mrea: "CubeTexture"

    def texture(self, dir: Dir):
        return self.color.texture(dir)

    def mreaTexture(self, dir: Dir):
        return self.mrea.texture(dir)

    def __str__(self):
        return pretty_id(self)

    def __repr__(self):
        return pretty_id(self)


@dataclass
class BlockShape:
    mask: np.ndarray


@dataclass
class BlockShapeIndex:
    ids: Dict[str, int]
    impl: cpp.shapes.Index


@dataclass
class BlockShapeTensor:
    impl: t.Tensor[t.U32]


@dataclass
class BlockTensor:
    impl: t.Tensor[t.U32]


@dataclass
class DyeTensor:
    impl: t.Tensor[t.U8]


@dataclass
class MuckTensor:
    impl: t.Tensor[t.U8]


@dataclass
class MoistureTensor:
    impl: t.Tensor[t.U8]


@dataclass
class BlockSampleTensor:
    impl: t.Tensor[t.U32]


@dataclass
class BlockMesh:
    geometry: BlockGeometryBuffer
    material: BlockMaterialBuffer
    lighting: "LightingBuffer"
    atlas: BlockAtlas


@dataclass
class GlassMesh:
    geometry: BlockGeometryBuffer
    material: BlockMaterialBuffer
    lighting: "LightingBuffer"
    atlas: BlockAtlas


@dataclass(frozen=True)
class Flora:
    name: str
    samples: Tuple["FloraSample"]
    animation: "FloraAnimation"

    def __str__(self):
        return pretty_id(self)

    def __repr__(self):
        return pretty_id(self)

    def __eq__(self, other):
        return self.name == other.name and self.samples == other.samples

    def __hash__(self):
        return hash((self.name, self.samples))


@dataclass(frozen=True)
class FloraAnimation:
    rotation: str
    wind: str


@dataclass
class FloraAtlas:
    colors: "TextureAtlas"


@dataclass(frozen=True)
class FloraGeometryBuffer:
    impl: cpp.florae.GeometryBuffer


@dataclass
class FloraIndex:
    impl: cpp.florae.Index
    florae: Dict[int, Flora]
    textures: List["Texture"]


@dataclass
class FloraItemMesh:
    vertices: np.ndarray
    indices: np.ndarray


@dataclass
class FloraMesh:
    geometry: FloraGeometryBuffer
    lighting: "LightingBuffer"
    atlas: FloraAtlas


@dataclass
class FloraSampleTransform:
    scale: AffineTransform
    rotation: AffineTransform
    translation: AffineTransform

    def __eq__(self, other):
        scale = self.scale == other.scale
        rotation = self.rotation == other.rotation
        translation = self.translation == other.translation
        return np.all(scale & rotation & translation)

    def __hash__(self):
        return hash(
            (
                tuple(self.scale.flatten()),
                tuple(self.rotation.flatten()),
                tuple(self.translation.flatten()),
            )
        )


@dataclass
class FloraSample:
    criteria: "FloraSampleCriteria"
    geometry: "FloraSampleGeometry"
    material: "FloraSampleMaterial"
    transform: FloraSampleTransform

    def __hash__(self):
        return hash(
            (
                self.criteria,
                self.geometry,
                self.material,
                self.transform,
            )
        )


@dataclass
class FloraSampleCriteria:
    growth: str
    muck: str

    def __hash__(self):
        return hash((self.growth, self.muck))


@dataclass
class FloraVertex:
    position: Tuple[float, float, float]
    normal: Tuple[float, float, float]
    uv: Tuple[float, float]
    texture_index: float

    def __eq__(self, other):
        return (
            self.position == other.position
            and self.normal == other.normal
            and self.uv == other.uv
            and self.texture_index == other.texture_index
        )

    def __hash__(self):
        return hash((self.position, self.normal, self.uv, self.texture_index))


@dataclass
class FloraSampleGeometry:
    vertices: Tuple[FloraVertex]
    indices: Tuple[int]

    def __str__(self):
        return pretty_id(self)

    def __repr__(self):
        return pretty_id(self)

    def __eq__(self, other):
        return self.vertices == other.vertices and self.indices == other.indices

    def __hash__(self):
        return hash((self.vertices, self.indices))


@dataclass(frozen=True)
class FloraSampleMaterial:
    textures: Tuple["Texture"]

    def __hash__(self):
        return hash(self.textures)


@dataclass
class FloraTensor:
    impl: t.Tensor[t.U32]


@dataclass
class GlassTensor:
    impl: t.Tensor[t.U32]


@dataclass
class GrowthTensor:
    impl: t.Tensor[t.U8]


@dataclass(frozen=True)
class GLTF:
    gltf: pygltflib.GLTF2


@dataclass(frozen=True)
class GLB:
    data: bytes


@dataclass(frozen=True)
class GLTFItemMesh:
    gltf: Union[GLTF, GLB]
    # A column-major 4x4 matrix.
    hand_attachment_transform: List[float]


@dataclass(frozen=True)
class GeometryBuffer:
    vertices: ArrayData
    indices: ArrayData


@dataclass(frozen=True)
class GroupIndex:
    impl: cpp.groups.Index


@dataclass(frozen=True)
class GroupSubMesh:
    impl: cpp.groups.Mesh


@dataclass(frozen=True)
class GroupMesh:
    blocks: GroupSubMesh
    florae: GroupSubMesh
    glass: GroupSubMesh


@dataclass(frozen=True)
class WireframeMesh:
    impl: cpp.shapes.WireframeMesh


@dataclass(frozen=True)
class WireframeMesh:
    impl: cpp.shapes.WireframeMesh


@dataclass(frozen=True)
class GroupTensor:
    impl: cpp.groups.Tensor


@dataclass(frozen=True)
class ItemTable:
    items: Dict[str, Any]


ItemMesh = Union[BlockItemMesh, FloraItemMesh, GLTFItemMesh]


@dataclass(frozen=True)
class LightingBuffer:
    impl: cpp.lighting.Buffer


@dataclass
class MapTexture:
    white: List["Texture"]
    black: List["Texture"]


@dataclass
class Mask:
    impl: t.Tensor[t.Bool]


@dataclass
class OcclusionTensor:
    impl: t.Tensor[t.U8]


@dataclass(frozen=True)
class PNG:
    data: bytes


@dataclass
class Shaper:
    index: Dict[int, List[int]]
    overrides: List[int]


@dataclass(frozen=True)
class SourceFile:
    extension: str
    content: str


@dataclass(frozen=True)
class SpatialBuffer:
    rank: ArrayData


@dataclass(frozen=True)
class TerrainMesh:
    block: BlockMesh
    flora: FloraMesh
    glass: GlassMesh


@dataclass(frozen=True)
class TerrainTensor:
    impl: t.Tensor[t.U32]


class Texture(ArrayData):
    pass


class TextureAtlas(ArrayData):
    pass


@dataclass(frozen=True)
class Transform:
    impl: cpp.transforms.Transform

    def __repr__(self):
        return f"[P={self.impl.permute}, R={self.impl.reflect}, S={self.impl.shift}]"

    def __eq__(self, other):
        return all(
            [
                self.impl.permute == other.impl.permute,
                self.impl.reflect == other.impl.reflect,
                self.impl.shift == other.impl.shift,
            ]
        )

    def __hash__(self):
        return hash(
            (
                tuple(self.impl.permute),
                tuple(self.impl.reflect),
                tuple(self.impl.shift),
            )
        )


@dataclass
class TypeScriptFile:
    src: str


@dataclass(frozen=True)
class VoxMesh:
    """Mesh derived from ".vox" MagicaVoxel files.

    Has color information embedded in vertex attributes as the "texture attributes".
    """

    geometry: "GeometryBuffer"
    # Transform that should be applied to the resulting mesh.
    transform: Optional[npt.NDArray]


@dataclass(frozen=True)
class VoxelMeshMaterial:
    colors: "TextureAtlas"


@dataclass
class VoxelMesh:
    geometry: "GeometryBuffer"
    material: VoxelMeshMaterial


@dataclass(frozen=True)
class WaterGeometryBuffer:
    impl: cpp.water.GeometryBuffer


@dataclass(frozen=True)
class WaterMesh:
    geometry: WaterGeometryBuffer
    lighting: LightingBuffer


@dataclass(frozen=True)
class WaterTensor:
    impl: t.Tensor[t.U8]


@dataclass
class WEBM:
    data: bytes


@dataclass(frozen=True)
class Placeable:
    item_id: int
    position: Tuple[int, int, int]
    orientation: Tuple[int, int]


@dataclass(frozen=True)
class BlueprintGroupDefinition:
    id: int
    name: str
    tensor: GroupTensor


WearableDefinitionList = List[Tuple[str, str]]
