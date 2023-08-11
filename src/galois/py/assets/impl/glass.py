import json
from copy import copy
from dataclasses import astuple
from typing import Dict

import numpy as np
from impl import types as t
from impl.buffers import make_uint_buffer
from impl.hashing import position_hash
from impl.meshes import box_geometry
from impl.repo import open_file
from impl.textures import (
    build_atlas,
    cube_texture_to_rgba_array,
    obj_to_cube_texture,
)

from voxeloo import galois as cpp


def load_glass_file(path: str):
    with open_file(path) as f:
        block = json.loads(f.read())

    return t.Glass(
        samples=tuple(
            [
                t.BlockSample(
                    name=block["name"],
                    criteria=t.BlockSampleCriteria(**sample["criteria"]),
                    texture=t.BlockSampleTexture(
                        color=obj_to_cube_texture(
                            sample["material"]["color"], mode="RGBA"
                        ),
                        mrea=obj_to_cube_texture(
                            sample["material"]["mrea"], mode="RGBA"
                        ),
                    ),
                )
                for sample in block["samples"]
            ]
        ),
    )


def build_index(
    blocks: Dict[int, t.Glass],
    error_id: int,
    dye_map: Dict[str, int],
):
    def convert_criteria(criteria: t.BlockSampleCriteria):
        return (
            criteria.position,
            dye_map.get(criteria.dye, 0),
            criteria.muck,
            criteria.moisture,
        )

    # Assign an ID to each sample.
    samples = []
    for block in blocks.values():
        samples += block.samples
    reverse = {sample: i for i, sample in enumerate(samples)}

    # Generate the index mapping each block to its sample IDs.
    builder = cpp.blocks.IndexBuilder(max(blocks.keys()), error_id)
    for id, block in blocks.items():
        builder.add_block(
            id,
            [
                (convert_criteria(sample.criteria), reverse[sample])
                for sample in block.samples
            ],
        )
    return t.GlassIndex(builder.build(), blocks, samples)


def glass_as_rgba_array(glass: t.Glass):
    sample = glass.samples[0]
    color = copy(sample.texture.color)
    color.x_neg.data[:, :, 3] = 255
    color.x_pos.data[:, :, 3] = 255
    color.y_neg.data[:, :, 3] = 255
    color.y_pos.data[:, :, 3] = 255
    color.z_neg.data[:, :, 3] = 255
    color.z_pos.data[:, :, 3] = 255

    return cube_texture_to_rgba_array(color)


def to_item_mesh(block: int, index: t.BlockIndex):
    box = box_geometry(positions=True, normals=False, dir=True, uv=True)
    # NOTE: This currently returns only the item mesh with the undyed/no
    # moisture sample applied.
    return t.GlassItemMesh(
        sample=index.impl.get_sampler(block).get(0).offsets[0],
        vertices=box.vertices,
        indices=box.indices,
    )
