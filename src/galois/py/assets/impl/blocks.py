import json
from collections import defaultdict
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


def sample(block: t.Block, x: int, y: int, z: int):
    # TODO: Update this to use the same function in blocks.hpp
    black = filter(
        lambda s: s.criteria.position == "black",
        block.samples,
    )
    white = filter(
        lambda s: s.criteria.position == "white",
        block.samples,
    )
    l = list(black) if (x + y + z) % 2 == 0 else list(white)
    return l[position_hash(x, y, z) % len(l)]


def load_block_file(path: str):
    with open_file(path) as f:
        block = json.loads(f.read())

    return t.Block(
        samples=tuple(
            [
                t.BlockSample(
                    name=block["name"],
                    criteria=t.BlockSampleCriteria(**sample["criteria"]),
                    texture=t.BlockSampleTexture(
                        color=obj_to_cube_texture(sample["material"]["color"]),
                        mrea=obj_to_cube_texture(sample["material"]["mrea"]),
                    ),
                )
                for sample in block["samples"]
            ]
        ),
    )


def block_as_rgba_array(block: t.Block):
    sample = block.samples[0]
    color = sample.texture.color
    alpha = np.full(
        (color.x_neg.data.shape[0], color.x_neg.data.shape[1], 1), 255
    )
    return cube_texture_to_rgba_array(
        t.CubeTexture(
            t.Texture(np.dstack((color.x_neg.data, alpha))),
            t.Texture(np.dstack((color.x_pos.data, alpha))),
            t.Texture(np.dstack((color.y_neg.data, alpha))),
            t.Texture(np.dstack((color.y_pos.data, alpha))),
            t.Texture(np.dstack((color.z_neg.data, alpha))),
            t.Texture(np.dstack((color.z_pos.data, alpha))),
        )
    )


def build_index(
    blocks: Dict[int, t.Block],
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
    return t.BlockIndex(builder.build(), blocks, samples)


def to_atlas(index: t.BlockIndex):
    # Assign an ID to each distinct texture.
    # This gives a unique ID to every unique color/mrea pair,
    # but in the future, we may want to share mrea textures,
    # so we may want to add a separate offset ID
    # This may be a bigger deal for normal maps which may need to be larger.
    textures = set()
    for sample in index.samples:
        texture = sample.texture
        textures.add((texture.color.x_neg, texture.mrea.x_neg))
        textures.add((texture.color.x_pos, texture.mrea.x_pos))
        textures.add((texture.color.y_neg, texture.mrea.y_neg))
        textures.add((texture.color.y_pos, texture.mrea.y_pos))
        textures.add((texture.color.z_neg, texture.mrea.z_neg))
        textures.add((texture.color.z_pos, texture.mrea.z_pos))
    textures = list(textures)
    reverse = {texture: i for i, texture in enumerate(textures)}

    # Generate the index mapping (sample, dir) to its texture ID.
    offsets = []
    for sample in index.samples:
        texture = sample.texture
        offsets.append(reverse[(texture.color.x_neg, texture.mrea.x_neg)])
        offsets.append(reverse[(texture.color.x_pos, texture.mrea.x_pos)])
        offsets.append(reverse[(texture.color.y_neg, texture.mrea.y_neg)])
        offsets.append(reverse[(texture.color.y_pos, texture.mrea.y_pos)])
        offsets.append(reverse[(texture.color.z_neg, texture.mrea.z_neg)])
        offsets.append(reverse[(texture.color.z_pos, texture.mrea.z_pos)])

    # Unmuck mapping
    unmuck_maps = []
    num_matched = defaultdict(int)
    for sample in index.samples:
        unmuck_samples = [
            e
            for e in index.samples
            if e.name == sample.name
            and e.criteria.position == sample.criteria.position
            and e.criteria.dye == sample.criteria.dye
            and e.criteria.moisture == sample.criteria.moisture
            and e.criteria.muck == "none"
        ]

        unmuck_sample = sample
        # If we find a match, try to use the corresponding offset for the sample
        # candidates for things like grass flower textures
        if sample.criteria.muck == "muck" and len(unmuck_samples) > 0:
            key = (
                sample.name,
                sample.criteria.position,
                sample.criteria.dye,
                sample.criteria.moisture,
            )
            existing_matches = num_matched[key]
            offset = existing_matches
            num_matched[key] += 1
            if offset < len(unmuck_samples):
                unmuck_sample = unmuck_samples[offset]
            else:
                unmuck_sample = unmuck_samples[0]

        texture = unmuck_sample.texture
        unmuck_maps.append(reverse[(texture.color.x_neg, texture.mrea.x_neg)])
        unmuck_maps.append(reverse[(texture.color.x_pos, texture.mrea.x_pos)])
        unmuck_maps.append(reverse[(texture.color.y_neg, texture.mrea.y_neg)])
        unmuck_maps.append(reverse[(texture.color.y_pos, texture.mrea.y_pos)])
        unmuck_maps.append(reverse[(texture.color.z_neg, texture.mrea.z_neg)])
        unmuck_maps.append(reverse[(texture.color.z_pos, texture.mrea.z_pos)])

    return t.BlockAtlas(
        atlas=build_atlas([texture[0].data for texture in textures]),
        mreaAtlas=build_atlas([texture[1].data for texture in textures]),
        index=make_uint_buffer(offsets),
        unmucked_index=make_uint_buffer(unmuck_maps),
    )


def to_item_mesh(block: int, index: t.BlockIndex):
    box = box_geometry(positions=True, normals=False, dir=True, uv=True)
    # NOTE: This currently returns only the item mesh with the undyed/no
    # moisture sample applied.
    return t.BlockItemMesh(
        sample=index.impl.get_sampler(block).get(0).offsets[0],
        vertices=box.vertices,
        indices=box.indices,
    )
