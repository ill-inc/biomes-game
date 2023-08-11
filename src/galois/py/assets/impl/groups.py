from typing import OrderedDict

import numpy as np
from impl import types as t

from voxeloo import galois as cpp


def add_alpha(pixels: np.ndarray):
    ret = np.zeros(shape=(*pixels.shape[0:2], 4), dtype=np.uint8)
    ret[:, :, 0:3] = pixels[:, :, 0:3]
    if pixels.shape[2] == 4:
        ret[:, :, 3] = pixels[:, :, 3]
    else:
        ret[:, :, 3] = 255
    return ret


class TextureSet:
    def __init__(self):
        self.dict = OrderedDict()

    def __getitem__(self, texture: t.Texture):
        return self.dict[texture]

    def add(self, texture: t.Texture):
        return self.dict.setdefault(texture, len(self.dict))

    def list(self):
        return [
            cpp.groups.Texture.fromarray(add_alpha(t.data))
            for t in self.dict.keys()
        ]


def populate_block_textures(index: t.BlockIndex, textures: TextureSet):
    # Assign an ID to each distinct texture.
    for sample in index.samples:
        color = sample.texture.color
        textures.add(color.x_neg)
        textures.add(color.x_pos)
        textures.add(color.y_neg)
        textures.add(color.y_pos)
        textures.add(color.z_neg)
        textures.add(color.z_pos)

    # Generate the index mapping (sample, dir) to its texture ID.
    offsets = []
    for i, sample in enumerate(index.samples):
        color = sample.texture.color
        offsets.append(textures[color.x_neg])
        offsets.append(textures[color.x_pos])
        offsets.append(textures[color.y_neg])
        offsets.append(textures[color.y_pos])
        offsets.append(textures[color.z_neg])
        offsets.append(textures[color.z_pos])

    return offsets


def populate_flora_textures(index: t.FloraIndex, textures: TextureSet):
    offsets = []
    for texture in index.textures:
        offsets.append(textures.add(texture))
    return offsets


def to_index(
    block_index: t.BlockIndex,
    shape_index: t.BlockShapeIndex,
    flora_index: t.FloraIndex,
    glass_index: t.BlockIndex,
):
    textures = TextureSet()
    block_offsets = populate_block_textures(block_index, textures)
    flora_offsets = populate_flora_textures(flora_index, textures)
    glass_offsets = populate_block_textures(glass_index, textures)
    return t.GroupIndex(
        impl=cpp.groups.to_index(
            block_index.impl,
            shape_index.impl,
            flora_index.impl,
            glass_index.impl,
            textures.list(),
            block_offsets,
            flora_offsets,
            glass_offsets
        ),
    )


def to_mesh(tensor: t.GroupTensor, index: t.GroupIndex):
    mesh = cpp.groups.to_mesh(tensor.impl, index.impl)
    return t.GroupMesh(
        blocks=t.GroupSubMesh(mesh.blocks),
        florae=t.GroupSubMesh(mesh.florae),
        glass=t.GroupSubMesh(mesh.glass),
    )
