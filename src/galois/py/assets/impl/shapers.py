from functools import cache
from typing import List

import numpy as np
from impl import types as t

from voxeloo import galois as cpp
from voxeloo.galois.transforms import Transform as TransformCpp


@cache
def transform_index():
    permutations = [
        [2, 1, 0],
        [2, 0, 1],
        [1, 2, 0],
        [1, 0, 2],
        [0, 2, 1],
        [0, 1, 2],
    ]

    reflections = [
        [0, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
        [1, 1, 0],
        [0, 0, 1],
        [1, 0, 1],
        [0, 1, 1],
        [1, 1, 1],
    ]

    ret = {}
    for px, py, pz in permutations:
        for rx, ry, rz in reflections:
            transform = t.Transform(
                impl=cpp.transforms.compose(
                    cpp.transforms.reflect(rx, ry, rz),
                    cpp.transforms.permute(px, py, pz),
                ),
            )
            ret[transform] = len(ret)
    return ret


def orientation_key(yaw: int, pitch: int):
    return (pitch & 0x3) << 2 | yaw & 0x3


def compose(base: TransformCpp, *transforms: TransformCpp):
    for transform in transforms:
        base = cpp.transforms.compose(transform, base)
    return base


def rotate_yaw(transform: TransformCpp):
    return compose(
        transform,
        cpp.transforms.reflect(1, 0, 0),
        cpp.transforms.permute(2, 1, 0),
    )


def rotate_pitch(transform: TransformCpp):
    return compose(
        transform,
        cpp.transforms.reflect(0, 0, 1),
        cpp.transforms.permute(0, 2, 1),
    )


def invert_y(transform: TransformCpp):
    return compose(
        transform,
        cpp.transforms.reflect(0, 1, 0),
    )


def to_shaper(
    index: t.BlockShapeIndex,
    id: int,
    overrides: List[int],
    transform: t.Transform,
):
    assert tuple(transform.impl.shift) == (0, 0, 0)

    # Build the orientation-based lookup table.
    lut = {}
    index = transform_index()
    for pitch in range(3):
        next = rotate_pitch(rotate_pitch(rotate_pitch(transform.impl)))
        for _ in range(pitch):
            next = rotate_pitch(next)
        for yaw in range(4):
            isos = []
            for _ in range(2):
                key = index[t.Transform(impl=next)]
                isos.append(cpp.shapes.to_isomorphism_id(id, key))
                next = invert_y(next)
            lut[orientation_key(yaw, pitch)] = isos
            next = rotate_yaw(next)

    return t.Shaper(
        index=list(sorted(lut.items(), key=lambda kv: kv[0])),
        overrides=overrides,
    )
