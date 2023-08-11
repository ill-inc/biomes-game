from typing import Dict, List, Tuple, Union

import numpy as np
import numpy.typing as npt
from impl import maps
from impl import types as t

Dir = t.Dir


def multiply_vertices(
    vertices: Union[List, np.ndarray],
    positions: np.ndarray,
    attributes: np.ndarray,
):
    vertices = np.array(vertices)

    # Multiply the vertices for each position
    pad = vertices.shape[1] - 3
    shifts = np.pad(positions, [(0, 0), (0, pad)])[:, np.newaxis, :]
    vertices = np.array(vertices)[np.newaxis, :, :] + shifts

    # Append the texture attributes
    attr_shape = (attributes.shape[0], vertices.shape[1], attributes.shape[1])
    attributes = np.broadcast_to(attributes[:, np.newaxis, :], attr_shape)
    vertices = np.concatenate([vertices, attributes], axis=-1)

    return vertices.reshape(-1, vertices.shape[-1])


def multiply_indices(indices: Union[List, np.ndarray], stride: int, count: int):
    shift = stride * np.arange(count)[:, np.newaxis]
    indices = np.tile(np.array(indices).flatten(), (count, 1)) + shift
    return indices.flatten().astype(np.uint32)


def lookup_attributes(
    map: maps.Map,
    mask: np.ndarray,
    attribute_index: Dict[int, Union[npt.NDArray, float]],
):
    index = np.array(
        [
            np.atleast_1d(attribute_index[i + 1])
            for i in range(map.values.max())
        ],
    )
    index = np.pad(index, [(1, 0), (0, 0)])

    return index[map.values[mask]]


def voxel_geometry(
    map: maps.Map, attributes: Dict[Tuple[Dir, int], npt.NDArray]
):
    vertices = []

    u0, v0 = 0, 0
    u1, v1 = 1, 1

    # Extracts an index of the voxel key to its offset for the given direction.
    dir_attributes = lambda d: {
        key: offset for (dir, key), offset in attributes.items() if d == dir
    }

    # z_neg
    mask = np.logical_and(
        np.pad(map.values[:-1, :, :], [(1, 0), (0, 0), (0, 0)]) == 0,
        map.values[:, :, :] != 0,
    )

    vertices.append(
        multiply_vertices(
            [
                [1, 0, 0, Dir.Z_NEG.float(), u0, v0],
                [0, 0, 0, Dir.Z_NEG.float(), u1, v0],
                [0, 1, 0, Dir.Z_NEG.float(), u1, v1],
                [1, 1, 0, Dir.Z_NEG.float(), u0, v1],
            ],
            np.stack(np.where(mask), axis=-1)[:, [2, 1, 0]],
            lookup_attributes(map, mask, dir_attributes(Dir.Z_NEG)),
        )
    )

    # z_pos
    mask = np.logical_and(
        np.pad(map.values[1:, :, :], [(0, 1), (0, 0), (0, 0)]) == 0,
        map.values[:, :, :] != 0,
    )
    vertices.append(
        multiply_vertices(
            [
                [0, 0, 1, Dir.Z_POS.float(), u0, v0],
                [1, 0, 1, Dir.Z_POS.float(), u1, v0],
                [1, 1, 1, Dir.Z_POS.float(), u1, v1],
                [0, 1, 1, Dir.Z_POS.float(), u0, v1],
            ],
            np.stack(np.where(mask), axis=-1)[:, [2, 1, 0]],
            lookup_attributes(map, mask, dir_attributes(Dir.Z_POS)),
        )
    )

    # y_neg
    mask = np.logical_and(
        np.pad(map.values[:, :-1, :], [(0, 0), (1, 0), (0, 0)]) == 0,
        map.values[:, :, :] != 0,
    )
    vertices.append(
        multiply_vertices(
            [
                [0, 0, 1, Dir.Y_NEG.float(), u0, v0],
                [0, 0, 0, Dir.Y_NEG.float(), u0, v1],
                [1, 0, 0, Dir.Y_NEG.float(), u1, v1],
                [1, 0, 1, Dir.Y_NEG.float(), u1, v0],
            ],
            np.stack(np.where(mask), axis=-1)[:, [2, 1, 0]],
            lookup_attributes(map, mask, dir_attributes(Dir.Y_NEG)),
        )
    )

    # y_pos
    mask = np.logical_and(
        np.pad(map.values[:, 1:, :], [(0, 0), (0, 1), (0, 0)]) == 0,
        map.values[:, :, :] != 0,
    )
    vertices.append(
        multiply_vertices(
            [
                [0, 1, 0, Dir.Y_POS.float(), u0, v0],
                [0, 1, 1, Dir.Y_POS.float(), u0, v1],
                [1, 1, 1, Dir.Y_POS.float(), u1, v1],
                [1, 1, 0, Dir.Y_POS.float(), u1, v0],
            ],
            np.stack(np.where(mask), axis=-1)[:, [2, 1, 0]],
            lookup_attributes(map, mask, dir_attributes(Dir.Y_POS)),
        )
    )

    # x_neg
    mask = np.logical_and(
        np.pad(map.values[:, :, :-1], [(0, 0), (0, 0), (1, 0)]) == 0,
        map.values[:, :, :] != 0,
    )
    vertices.append(
        multiply_vertices(
            [
                [0, 0, 0, Dir.X_NEG.float(), u0, v0],
                [0, 0, 1, Dir.X_NEG.float(), u1, v0],
                [0, 1, 1, Dir.X_NEG.float(), u1, v1],
                [0, 1, 0, Dir.X_NEG.float(), u0, v1],
            ],
            np.stack(np.where(mask), axis=-1)[:, [2, 1, 0]],
            lookup_attributes(map, mask, dir_attributes(Dir.X_NEG)),
        )
    )

    # x_pos
    mask = np.logical_and(
        np.pad(map.values[:, :, 1:], [(0, 0), (0, 0), (0, 1)]) == 0,
        map.values[:, :, :] != 0,
    )
    vertices.append(
        multiply_vertices(
            [
                [1, 0, 1, Dir.X_POS.float(), u0, v0],
                [1, 0, 0, Dir.X_POS.float(), u1, v0],
                [1, 1, 0, Dir.X_POS.float(), u1, v1],
                [1, 1, 1, Dir.X_POS.float(), u0, v1],
            ],
            np.stack(np.where(mask), axis=-1)[:, [2, 1, 0]],
            lookup_attributes(map, mask, dir_attributes(Dir.X_POS)),
        )
    )

    # Shift all vertex positions by the map origin.
    vertices = np.concatenate(vertices)
    vertices[:, 0:3] += map.origin

    return t.GeometryBuffer(
        vertices=t.ArrayData(vertices.astype(np.float32)),
        indices=t.ArrayData(
            multiply_indices(
                indices=[
                    [0, 1, 3],
                    [1, 2, 3],
                ],
                stride=4,
                count=vertices.shape[0] // 4,
            )
        ),
    )


def box_geometry(
    positions: bool = True,
    normals: bool = True,
    uv: bool = True,
    dir: bool = True,
):
    x0, y0, z0 = 0, 0, 0
    x1, y1, z1 = 1, 1, 1

    u0, v0 = 0, 0
    u1, v1 = 1, 1

    vertices = np.array(
        [
            # x-neg face
            (x0, y0, z0, -1, 0, 0, u0, v0, Dir.X_NEG.value),
            (x0, y0, z1, -1, 0, 0, u1, v0, Dir.X_NEG.value),
            (x0, y1, z1, -1, 0, 0, u1, v1, Dir.X_NEG.value),
            (x0, y1, z0, -1, 0, 0, u0, v1, Dir.X_NEG.value),
            # x-pos face
            (x1, y0, z1, 1, 0, 0, u0, v0, Dir.X_POS.value),
            (x1, y0, z0, 1, 0, 0, u1, v0, Dir.X_POS.value),
            (x1, y1, z0, 1, 0, 0, u1, v1, Dir.X_POS.value),
            (x1, y1, z1, 1, 0, 0, u0, v1, Dir.X_POS.value),
            # y-neg face
            (x0, y0, z1, 0, -1, 0, u0, v0, Dir.Y_NEG.value),
            (x0, y0, z0, 0, -1, 0, u0, v1, Dir.Y_NEG.value),
            (x1, y0, z0, 0, -1, 0, u1, v1, Dir.Y_NEG.value),
            (x1, y0, z1, 0, -1, 0, u1, v0, Dir.Y_NEG.value),
            # y-pos face
            (x0, y1, z0, 0, 1, 0, u0, v0, Dir.Y_POS.value),
            (x0, y1, z1, 0, 1, 0, u0, v1, Dir.Y_POS.value),
            (x1, y1, z1, 0, 1, 0, u1, v1, Dir.Y_POS.value),
            (x1, y1, z0, 0, 1, 0, u1, v0, Dir.Y_POS.value),
            # z-neg face
            (x1, y0, z0, 0, 0, -1, u0, v0, Dir.Z_NEG.value),
            (x0, y0, z0, 0, 0, -1, u1, v0, Dir.Z_NEG.value),
            (x0, y1, z0, 0, 0, -1, u1, v1, Dir.Z_NEG.value),
            (x1, y1, z0, 0, 0, -1, u0, v1, Dir.Z_NEG.value),
            # z-pos face
            (x0, y0, z1, 0, 0, 1, u0, v0, Dir.Z_POS.value),
            (x1, y0, z1, 0, 0, 1, u1, v0, Dir.Z_POS.value),
            (x1, y1, z1, 0, 0, 1, u1, v1, Dir.Z_POS.value),
            (x0, y1, z1, 0, 0, 1, u0, v1, Dir.Z_POS.value),
        ],
        dtype=np.float32,
    )

    mask = [*[positions] * 3, *[normals] * 3, *[uv] * 2, dir]

    return t.GeometryBuffer(
        vertices=t.ArrayData(vertices[:, mask]),
        indices=t.ArrayData(
            np.array(
                [
                    [0, 1, 2],
                    [0, 2, 3],
                    [4, 5, 6],
                    [4, 6, 7],
                    [8, 9, 10],
                    [8, 10, 11],
                    [12, 13, 14],
                    [12, 14, 15],
                    [16, 17, 18],
                    [16, 18, 19],
                    [20, 21, 22],
                    [20, 22, 23],
                ],
                dtype=np.uint32,
            )
        ),
    )


def billboard_geometry():
    u0, v0 = 0, 0
    u1, v1 = 1, 1
    return t.GeometryBuffer(
        vertices=t.ArrayData(
            np.array(
                [
                    # x face
                    (0.5, 0, 0, 1, 0, 0, u0, v0, 0),
                    (0.5, 0, 1, 1, 0, 0, u1, v0, 0),
                    (0.5, 1, 1, 1, 0, 0, u1, v1, 0),
                    (0.5, 1, 0, 1, 0, 0, u0, v1, 0),
                    # y face
                    (0, 0.5, 0, 0, 1, 0, u0, v0, 1),
                    (1, 0.5, 0, 0, 1, 0, u1, v0, 1),
                    (1, 0.5, 1, 0, 1, 0, u1, v1, 1),
                    (0, 0.5, 1, 0, 1, 0, u0, v1, 1),
                    # z face
                    (0, 0, 0.5, 0, 0, 1, u0, v0, 2),
                    (1, 0, 0.5, 0, 0, 1, u1, v0, 2),
                    (1, 1, 0.5, 0, 0, 1, u1, v1, 2),
                    (0, 1, 0.5, 0, 0, 1, u0, v1, 2),
                ],
                dtype=np.float32,
            )
        ),
        indices=t.ArrayData(
            np.array(
                [
                    [0, 1, 2],
                    [0, 2, 3],
                    [4, 5, 6],
                    [4, 6, 7],
                    [8, 9, 10],
                    [8, 10, 11],
                ],
                dtype=np.uint32,
            )
        ),
    )


# Creates a mesh for an AABB from l to h
def get_box(l: np.array, h: np.array):
    lx, ly, lz = l
    hx, hy, hz = h
    vertices = [
        [lx, ly, lz],
        [lx, ly, hz],
        [lx, hy, lz],
        [lx, hy, hz],
        [hx, ly, lz],
        [hx, ly, hz],
        [hx, hy, lz],
        [hx, hy, hz],
    ]
    # Point are indices here:
    triangles = [
        # neg_x face
        [0, 1, 3],
        [0, 3, 2],
        # neg_y face
        [0, 5, 1],
        [0, 4, 5],
        # neg_z face
        [0, 2, 6],
        [0, 6, 4],
        # pos_x face
        [4, 7, 5],
        [4, 6, 7],
        # pos_y face
        [2, 3, 7],
        [2, 7, 6],
        # pos_z face
        [1, 7, 3],
        [1, 5, 7],
    ]
    return (vertices, [i for tri in triangles for i in tri])
