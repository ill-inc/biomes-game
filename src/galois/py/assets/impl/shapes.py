from dataclasses import dataclass
from hashlib import sha1
from typing import List, Set, Tuple

import numpy as np
from impl import maps
from impl import types as t
from impl.meshes import get_box

import voxeloo
from voxeloo import galois as cpp

DIM = 8


class Pad:
    """Array paddings to handle the boundary case of convolutions."""

    x_neg = [(0, 0), (0, 0), (1, 0)]
    x_pos = [(0, 0), (0, 0), (0, 1)]
    y_neg = [(0, 0), (1, 0), (0, 0)]
    y_pos = [(0, 0), (0, 1), (0, 0)]
    z_neg = [(1, 0), (0, 0), (0, 0)]
    z_pos = [(0, 1), (0, 0), (0, 0)]


@dataclass
class QuadList:
    vertices: List[np.ndarray]
    indices: List[np.ndarray]

    def __str__(self):
        return "QuadList"


@dataclass
class Isomorphism:
    mask: np.ndarray

    def __post_init__(self):
        object.__setattr__(self, "mask", self.mask.copy(order="C"))

    def hash(self):
        return sha1(self.mask).digest()


def generate_isomorphisms(mask: np.ndarray):
    permutations = [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0],
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

    isomorphisms = []
    for px, py, pz in permutations:
        for rx, ry, rz in reflections:
            isomap = np.transpose(mask, (pz, py, px))
            isomap = np.flip(isomap, np.where([rz, ry, rx])[0])
            isomorphisms.append(Isomorphism(isomap))

    return isomorphisms


def generate_occlusion_mask(isomorphism: Isomorphism):
    x_neg = int(isomorphism.mask[:, :, 0].min())
    x_pos = int(isomorphism.mask[:, :, DIM - 1].min()) << 1
    y_neg = int(isomorphism.mask[:, 0, :].min()) << 2
    y_pos = int(isomorphism.mask[:, DIM - 1, :].min()) << 3
    z_neg = int(isomorphism.mask[0, :, :].min()) << 4
    z_pos = int(isomorphism.mask[DIM - 1, :, :].min()) << 5
    return x_neg | x_pos | y_neg | y_pos | z_neg | z_pos


def quad_vertices(vertices: List, mask: np.ndarray, scale: float):
    ret = []
    for x, y, z in np.stack(np.where(mask)[::-1], axis=-1):
        augmented = np.array(vertices)
        augmented[:, 0:3] += (x, y, z)
        augmented[:, 0:3] *= scale
        ret.extend(augmented)
    return np.array(ret, np.float32)


def quad_indices(quad_count: int):
    ret = []
    for i in range(quad_count):
        ret.extend(
            [
                [4 * i, 4 * i + 1, 4 * i + 2],
                [4 * i, 4 * i + 2, 4 * i + 3],
            ]
        )
    return np.array(ret, dtype=np.uint32)


def generate_quads(isomorphism: Isomorphism):
    builder = cpp.shapes.QuadsBuilder()

    mask_to_positions = lambda mask: (
        np.stack(np.where(mask)[::-1], axis=-1).tolist()
    )

    Dir = voxeloo.voxels.Dir
    Level = cpp.shapes.Level

    # Emit x_neg quads
    if isomorphism.mask[:, :, 0].all():
        builder.add([[0, 0, 0]], Dir.X_NEG, Level.MACRO)
    else:
        mask = np.logical_and(
            np.pad(isomorphism.mask[:, :, :-1], Pad.x_neg) == 0,
            isomorphism.mask,
        )
        builder.add(mask_to_positions(mask), Dir.X_NEG, Level.MICRO)

    # Emit x_pos quads
    if isomorphism.mask[:, :, -1].all():
        builder.add([[0, 0, 0]], Dir.X_POS, Level.MACRO)
    else:
        mask = np.logical_and(
            np.pad(isomorphism.mask[:, :, 1:], Pad.x_pos) == 0,
            isomorphism.mask,
        )
        builder.add(mask_to_positions(mask), Dir.X_POS, Level.MICRO)

    # Emit y_neg quads
    if isomorphism.mask[:, 0, :].all():
        builder.add([[0, 0, 0]], Dir.Y_NEG, Level.MACRO)
    else:
        mask = np.logical_and(
            np.pad(isomorphism.mask[:, :-1, :], Pad.y_neg) == 0,
            isomorphism.mask,
        )
        builder.add(mask_to_positions(mask), Dir.Y_NEG, Level.MICRO)

    # Emit y_pos quads
    if isomorphism.mask[:, -1, :].all():
        builder.add([[0, 0, 0]], Dir.Y_POS, Level.MACRO)
    else:
        mask = np.logical_and(
            np.pad(isomorphism.mask[:, 1:, :], Pad.y_pos) == 0,
            isomorphism.mask,
        )
        builder.add(mask_to_positions(mask), Dir.Y_POS, Level.MICRO)

    # Emit z_neg quads
    if isomorphism.mask[0, :, :].all():
        builder.add([[0, 0, 0]], Dir.Z_NEG, Level.MACRO)
    else:
        mask = np.logical_and(
            np.pad(isomorphism.mask[:-1, :, :], Pad.z_neg) == 0,
            isomorphism.mask,
        )
        builder.add(mask_to_positions(mask), Dir.Z_NEG, Level.MICRO)

    # Emit z_pos quads
    if isomorphism.mask[-1, :, :].all():
        builder.add([[0, 0, 0]], Dir.Z_POS, Level.MACRO)
    else:
        mask = np.logical_and(
            np.pad(isomorphism.mask[1:, :, :], Pad.z_pos) == 0,
            isomorphism.mask,
        )
        builder.add(mask_to_positions(mask), Dir.Z_POS, Level.MICRO)

    return builder.build()


def generate_boxes(isomorphism: Isomorphism):
    # Find the start position of every run.
    first = np.stack(
        np.where(
            np.logical_and(
                isomorphism.mask,
                np.logical_not(
                    np.pad(isomorphism.mask, [(0, 0), (0, 0), (1, 0)])[..., :-1]
                ),
            )
        ),
        axis=-1,
    )

    # Find the final position of every run.
    final = np.stack(
        np.where(
            np.logical_and(
                isomorphism.mask,
                np.logical_not(
                    np.pad(isomorphism.mask, [(0, 0), (0, 0), (0, 1)])[..., 1:]
                ),
            )
        ),
        axis=-1,
    )

    # Work out the box parameters.
    pos = first
    len = 1 + (final - first).sum(axis=-1)

    # Emit the list of boxes.
    builder = cpp.shapes.BoxesBuilder()
    for (z, y, x), l in zip(pos, len):
        builder.add([x, y, z], l)
    return builder.build()


Edge = Tuple[Tuple[int, int, int], Tuple[int, int, int]]


def generate_wireframe_edges(isomorphism: Isomorphism):
    mask = np.swapaxes(isomorphism.mask, 0, 2)
    padded = np.pad(mask, [(1, 2), (1, 2), (1, 2)])

    edges: List[Edge] = []

    def is_edge(mask):
        # We have an edge in the center of patterns like:
        # BB BE BE
        # BE EE EB
        # where B is block, E is empty
        valid = (
            [np.rot90(np.array([[1, 0], [0, 0]]), i) for i in range(4)]
            + [np.rot90(np.array([[1, 0], [0, 1]]), i) for i in range(2)]
            + [np.rot90(np.array([[1, 1], [1, 0]]), i) for i in range(4)]
        )
        return any(np.array_equal(mask, arr) for arr in valid)

    for x in range(1, padded.shape[0]):
        for y in range(1, padded.shape[1]):
            start = None
            for z in range(1, padded.shape[2]):
                if is_edge(padded[x - 1 : x + 1, y - 1 : y + 1, z]):
                    if start is None:
                        start = (x - 1, y - 1, z - 1)
                elif start is not None:
                    edges.append((start, (x - 1, y - 1, z - 1)))
                    start = None

    for x in range(1, padded.shape[0]):
        for z in range(1, padded.shape[2]):
            start = None
            for y in range(1, padded.shape[1]):
                if is_edge(padded[x - 1 : x + 1, y, z - 1 : z + 1]):
                    if start is None:
                        start = (x - 1, y - 1, z - 1)
                elif start is not None:
                    edges.append((start, (x - 1, y - 1, z - 1)))
                    start = None

    for y in range(1, padded.shape[1]):
        for z in range(1, padded.shape[2]):
            start = None
            for x in range(1, padded.shape[0]):
                if is_edge(padded[x, y - 1 : y + 1, z - 1 : z + 1]):
                    if start is None:
                        start = (x - 1, y - 1, z - 1)
                elif start is not None:
                    edges.append((start, (x - 1, y - 1, z - 1)))
                    start = None

    return edges


def generate_wireframe_mesh(edges: List[Edge]):
    builder = cpp.shapes.WireframeMeshBuilder()

    for u, v in edges:
        u = np.array(u) / 8
        v = np.array(v) / 8
        # Assume that diff is always one of [x, 0, 0], [0, x, 0], [0, 0, x] where x > 0
        diff = v - u
        width = 0.02
        shape = np.maximum(diff, np.array([width, width, width]))
        # offset so we are centered on the edge
        lo = u + width * (diff / np.linalg.norm(diff) - np.array([1, 1, 1])) / 2
        hi = lo + shape
        builder.add_triangles(*get_box(lo, hi))

    return builder.build()


def generate_isomorphism_mask(isomorphism: Isomorphism):
    return isomorphism.mask.reshape(-1)


def to_index(entries: List[Tuple[int, str, t.BlockShape]]):
    # Always add the empty shape.
    entries.append(
        [0, "void", t.BlockShape(np.zeros(shape=(8, 8, 8), dtype=bool))]
    )
    entries.sort(key=lambda e: e[0])

    # Fill in the index with an offset for each concrete ID as well as the LUTs
    # of quad geometry and occluion masks for each distinct isomorphism.
    ids = {}
    builder = cpp.shapes.IndexBuilder(entries[-1][0])
    isomorphisms = {}
    for id, name, shape in entries:
        assert id < 2**26, "Shape IDs must be less than 2**26."
        ids[name] = id
        for i, isomorphism in enumerate(generate_isomorphisms(shape.mask)):
            hash = isomorphism.hash()
            if hash not in isomorphisms:
                isomorphisms[hash] = builder.add_isomorphism(
                    generate_quads(isomorphism),
                    generate_boxes(isomorphism),
                    generate_wireframe_mesh(
                        generate_wireframe_edges(isomorphism)
                    ),
                    generate_occlusion_mask(isomorphism),
                    generate_isomorphism_mask(isomorphism),
                )
            builder.set_offset(
                cpp.shapes.to_isomorphism_id(id, i),
                isomorphisms[hash],
            )

    return t.BlockShapeIndex(
        ids=ids,
        impl=builder.build(),
    )
