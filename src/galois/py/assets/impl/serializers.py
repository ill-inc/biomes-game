import base64
import json
import traceback
from typing import Any, Dict

import numpy as np
import pygltflib
from impl import maps
from impl import types as t

from voxeloo import galois as cpp


def encode_bytes(bytes: bytes):
    return base64.b64encode(bytes).decode("utf-8")


def encode_array(array: np.ndarray):
    return {
        "shape": array.shape,
        "data": encode_bytes(array.tobytes()),
    }


def encode_sbo(buffer: cpp.sbo.Buffer):
    return {
        "shape": buffer.shape,
        "data": encode_bytes(buffer.view().tobytes()),
    }


def encode_map(map: maps.Map):
    return {
        "origin": np.array(map.origin).tolist(),
        "values": encode_array(map.values),
    }


def encode_table(table: maps.Table):
    return {
        "index": {key: str(val) for key, val in table.index.items()},
        "map": encode_map(table.map),
    }


def encode_gltf(gltf: pygltflib.GLTF2):
    return gltf.gltf_to_json()


def encode_dict(d: Dict, key="id", val="val"):
    return [{key: k, val: v} for k, v, in d.items()]


def to_nested_data(content: Any):
    return {k: v for k, v in to_data(content).items() if k != "kind"}


def to_data(content: Any):
    if isinstance(content, t.Binary):
        return {
            "kind": "Binary",
            "data": encode_bytes(content.data),
        }
    elif isinstance(content, t.Block):
        return {
            "kind": "Block",
            "info": str(content),
        }
    elif isinstance(content, t.BlockAtlas):
        return {
            "kind": "BlockAtlas",
            "colors": encode_array(content.atlas.data),
            "mrea": encode_array(content.mreaAtlas.data),
            "index": encode_array(content.index.data),
            "unmucked_index": encode_array(content.unmucked_index.data),
        }
    elif isinstance(content, t.BlockGeometryBuffer):
        return {
            "kind": "BlockGeometryBuffer",
            "vertices": encode_bytes(content.impl.vertex_data().tobytes()),
            "indices": encode_bytes(content.impl.index_data().tobytes()),
        }
    elif isinstance(content, t.BlockIndex):
        return {
            "kind": "BlockIndex",
            "index": content.impl.dumps(),
        }
    elif isinstance(content, t.GlassIndex):
        return {
            "kind": "GlassIndex",
            "index": content.impl.dumps(),
        }
    elif isinstance(content, t.BlockItemMesh):
        return {
            "kind": "BlockItemMesh",
            "sample": content.sample,
            "vertices": encode_bytes(content.vertices.data),
            "indices": encode_bytes(content.indices.data),
        }
    elif isinstance(content, t.GlassItemMesh):
        return {
            "kind": "GlassItemMesh",
            "sample": content.sample,
            "vertices": encode_bytes(content.vertices.data),
            "indices": encode_bytes(content.indices.data),
        }
    elif isinstance(content, t.BlockMaterialBuffer):
        return {
            "kind": "BlockMaterialBuffer",
            "rank": encode_sbo(content.impl.rank),
            "data": encode_sbo(content.impl.data),
        }
    elif isinstance(content, t.BlockMesh):
        return {
            "kind": "BlockMesh",
            "geometry": to_nested_data(content.geometry),
            "material": to_nested_data(content.material),
            "lighting": to_nested_data(content.lighting),
            "atlas": to_nested_data(content.atlas),
        }
    elif isinstance(content, t.GlassMesh):
        return {
            "kind": "GlassMesh",
            "geometry": to_nested_data(content.geometry),
            "material": to_nested_data(content.material),
            "lighting": to_nested_data(content.lighting),
            "atlas": to_nested_data(content.atlas),
        }
    elif isinstance(content, t.BlockSample):
        return {
            "kind": "BlockSample",
            "info": str(content),
        }
    elif isinstance(content, t.BlockShape):
        return {
            "kind": "BlockShape",
            "map": encode_map(content.map),
        }
    elif isinstance(content, t.BlockShapeIndex):
        return {
            "kind": "BlockShapeIndex",
            "ids": encode_dict(content.ids, key="name", val="id"),
            "index": content.impl.dumps(),
        }
    elif isinstance(content, t.BlockShapeTensor):
        return {
            "kind": "BlockShapeTensor",
            "map": content.impl.dumps(),
        }
    elif isinstance(content, t.BlockTensor):
        return {
            "kind": "BlockTensor",
            "map": content.impl.dumps(),
        }
    elif isinstance(content, t.DyeTensor):
        return {
            "kind": "DyeTensor",
            "map": content.impl.dumps(),
        }
    elif isinstance(content, t.MoistureTensor):
        return {
            "kind": "MoistureTensor",
            "map": content.impl.dumps(),
        }
    elif isinstance(content, t.Flora):
        return {
            "kind": "Flora",
            "info": str(content),
        }
    elif isinstance(content, t.FloraAtlas):
        return {
            "kind": "FloraAtlas",
            "colors": encode_array(content.colors.data),
        }
    elif isinstance(content, t.FloraGeometryBuffer):
        return {
            "kind": "FloraGeometryBuffer",
            "vertices": encode_bytes(content.impl.vertex_data().tobytes()),
            "indices": encode_bytes(content.impl.index_data().tobytes()),
        }
    elif isinstance(content, t.FloraIndex):
        return {
            "kind": "FloraIndex",
            "index": content.impl.dumps(),
        }
    elif isinstance(content, t.FloraItemMesh):
        return {
            "kind": "FloraItemMesh",
            "vertices": encode_bytes(content.vertices.data),
            "indices": encode_bytes(content.indices.data),
        }
    elif isinstance(content, t.FloraMesh):
        return {
            "kind": "FloraMesh",
            "geometry": to_nested_data(content.geometry),
            "lighting": to_nested_data(content.lighting),
            "atlas": to_nested_data(content.atlas),
        }
    elif isinstance(content, t.FloraSampleGeometry):
        return {
            "kind": "FloraSample",
            "info": str(content),
        }
    elif isinstance(content, t.FloraTensor):
        return {
            "kind": "FloraTensor",
            "map": content.impl.dumps(),
        }
    elif isinstance(content, Exception):
        return {
            "kind": "Error",
            "info": traceback.format_exception(
                type(content), content, content.__traceback__
            ),
        }
    elif isinstance(content, t.GLTF):
        return {
            "kind": "GLTF",
            "data": encode_gltf(content.gltf),
        }
    elif isinstance(content, t.GLTFItemMesh):
        return {
            "kind": "GLTFItemMesh",
            "hand_attachment_transform": content.hand_attachment_transform,
            "data": to_data(content.gltf),
        }
    elif isinstance(content, t.GLB):
        return {
            "kind": "GLB",
            "data": encode_bytes(content.data),
        }
    elif isinstance(content, t.GeometryBuffer):
        return {
            "kind": "GeometryBuffer",
            "vertices": encode_bytes(content.vertices.data),
            "indices": encode_bytes(content.indices.data),
        }
    elif isinstance(content, t.GroupSubMesh):
        return {
            "kind": "GroupSubMesh",
            "vertices": encode_bytes(content.impl.vertex_data().tobytes()),
            "indices": encode_bytes(content.impl.index_data().tobytes()),
            "texture": encode_array(content.impl.texture.data),
        }
    elif isinstance(content, t.GroupIndex):
        return {
            "kind": "GroupIndex",
            "index": content.impl.dumps(),
        }
    elif isinstance(content, t.GroupMesh):
        return {
            "kind": "GroupMesh",
            "blocks": to_nested_data(content.blocks),
            "florae": to_nested_data(content.florae),
            "glass": to_nested_data(content.glass),
        }
    elif isinstance(content, t.WireframeMesh):
        return {
            "kind": "WireframeMesh",
            "vertices": encode_bytes(content.impl.vertex_data().tobytes()),
            "indices": encode_bytes(content.impl.index_data().tobytes()),
        }
    elif isinstance(content, t.GroupTensor):
        return {
            "kind": "GroupTensor",
            "map": content.impl.dumps(),
        }
    elif isinstance(content, t.ItemTable):
        return {
            "kind": "ItemTable",
            "db": content.items,
        }
    elif isinstance(content, t.LightingBuffer):
        return {
            "kind": "LightingBuffer",
            "rank": encode_sbo(content.impl.rank),
            "data": encode_sbo(content.impl.data),
        }
    elif isinstance(content, t.Mask):
        return {
            "kind": "Mask",
            "map": content.impl.dumps(),
        }
    elif isinstance(content, t.OcclusionTensor):
        return {
            "kind": "OcclusionTensor",
            "map": content.impl.dumps(),
        }
    elif isinstance(content, t.PNG):
        return {
            "kind": "PNG",
            "data": encode_bytes(content.data),
        }
    elif isinstance(content, t.Shaper):
        return {
            "kind": "Shaper",
            "index": content.index,
        }
    elif isinstance(content, t.SourceFile):
        return {
            "kind": "SourceFile",
            "extension": content.extension,
            "content": content.content,
        }
    elif isinstance(content, t.TerrainMesh):
        return {
            "kind": "TerrainMesh",
            "block": to_nested_data(content.block),
            "flora": to_nested_data(content.flora),
            "glass": to_nested_data(content.glass),
        }
    elif isinstance(content, t.TerrainTensor):
        return {
            "kind": "TerrainTensor",
            "map": content.impl.dumps(),
        }
    elif isinstance(content, t.Texture):
        return {
            "kind": "Texture",
            "data": encode_array(content.data),
        }
    elif isinstance(content, t.TextureAtlas):
        return {
            "kind": "TextureAtlas",
            "data": encode_array(content.data),
        }
    elif isinstance(content, t.Transform):
        return {
            "kind": "Transform",
            "permute": content.permute,
            "reflect": content.reflect,
            "shift": content.shift,
        }
    elif isinstance(content, t.TypeScriptFile):
        return {
            "kind": "TypeScriptFile",
            "data": content.src,
        }
    elif isinstance(content, t.VoxelMesh):
        return {
            "kind": "VoxelMesh",
            "geometry": to_nested_data(content.geometry),
            "material": encode_array(content.material.colors.data),
        }
    elif isinstance(content, t.WaterGeometryBuffer):
        return {
            "kind": "WaterGeometryBuffer",
            "vertices": encode_bytes(content.impl.vertex_data().tobytes()),
            "indices": encode_bytes(content.impl.index_data().tobytes()),
        }
    elif isinstance(content, t.WaterMesh):
        return {
            "kind": "WaterMesh",
            "geometry": to_nested_data(content.geometry),
            "lighting": to_nested_data(content.lighting),
        }
    elif isinstance(content, t.WaterTensor):
        return {
            "kind": "WaterTensor",
            "map": content.impl.dumps(),
        }
    elif isinstance(content, t.WEBM):
        return {
            "kind": "WEBM",
            "data": encode_bytes(content.data),
        }

    raise t.SerializationError(f"Unable to serialize type: {type(content)}")


def serialize(content: Any):
    return json.dumps(content, default=to_data)
