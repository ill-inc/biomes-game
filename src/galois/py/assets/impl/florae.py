import base64
import copy
import json
from dataclasses import dataclass
from typing import Dict

import impl.affine_transforms as affine_transforms
import numpy as np
from impl import types as t
from impl.hashing import position_hash
from impl.repo import open_file
from impl.textures import build_atlas

from voxeloo import galois as cpp


def sample(flora: t.Flora, x: int, y: int, z: int):
    return flora.samples[position_hash(x, y, z) % len(flora.samples)]


def flora_as_rgb_array(flora: t.Flora):
    sample = flora.samples[0]
    texture = sample.material.textures[0]
    dim = texture.data.shape[0]
    out = np.zeros((dim, dim, dim, 4), dtype=np.uint8)
    out[-1, :, :, :] = texture.data
    return out


@dataclass
class QuadGeometry:
    vertices: np.ndarray
    indices: np.ndarray


def decode_array(shape: tuple[int], data: str, dtype: np.dtype):
    bytes = base64.b64decode(data)
    return np.frombuffer(bytes, dtype=dtype).reshape(shape)


def load_flora_file(path: str) -> t.Flora:
    with open_file(path) as f:
        flora = json.loads(f.read())

    def load_sample(sample):
        # Criteria
        criteria = t.FloraSampleCriteria(
            sample["criteria"]["growth"], sample["criteria"]["muck"]
        )

        # Transform
        scale = sample["transform"]["scale"]
        transform = t.FloraSampleTransform(
            affine_transforms.from_scale((scale, scale, scale)),
            affine_transforms.from_quaternion(
                tuple(sample["transform"]["rotate"])
            ),
            affine_transforms.from_translation(
                tuple(sample["transform"]["translate"])
            ),
        )

        # Material
        color_json = sample["mesh"]["material"]["color"]
        color = decode_array(
            tuple(color_json["shape"]), color_json["data"], np.uint8
        )
        material = t.FloraSampleMaterial(
            tuple(
                [
                    t.Texture(np.squeeze(tex))
                    for tex in np.split(color, color.shape[0])
                ]
            )
        )

        # Geometry
        indices_json = sample["mesh"]["geometry"]["indices"]
        indices = decode_array(
            tuple(indices_json["shape"]), indices_json["data"], np.uint16
        )
        vertices_json = sample["mesh"]["geometry"]["vertices"]
        vertices = decode_array(
            tuple(vertices_json["shape"]), vertices_json["data"], np.float32
        )
        geometry = t.FloraSampleGeometry(
            tuple(
                [
                    t.FloraVertex(
                        tuple(v[:3]), tuple(v[3:6]), tuple(v[6:8]), v[8]
                    )
                    for v in vertices
                ]
            ),
            tuple(indices.flatten()),
        )

        return t.FloraSample(criteria, geometry, material, transform)

    return t.Flora(
        name=flora["name"],
        samples=tuple([load_sample(sample) for sample in flora["samples"]]),
        animation=t.FloraAnimation(
            flora["animation"]["rotation"], flora["animation"]["wind"]
        ),
    )


def to_index(florae: Dict[int, t.Flora], fallback_id: int):
    # Assign an ID to each distinct sample.
    samples = []
    for flora in florae.values():
        samples += flora.samples
    rev_samples = {sample: i for i, sample in enumerate(samples)}

    # Assign an ID to each distinct texture.
    textures = set()
    for sample in samples:
        textures |= set(sample.material.textures)
    textures = list(textures)
    rev_textures = {texture: i for i, texture in enumerate(textures)}

    # Build the C++ meshing index.
    index_builder = cpp.florae.IndexBuilder()
    index_builder.set_fallback(fallback_id)
    for i, flora in florae.items():
        index_builder.add_samples(
            i,
            [
                (
                    rev_samples[sample],
                    (sample.criteria.growth, sample.criteria.muck),
                )
                for sample in flora.samples
            ],
        )
        index_builder.set_animation(
            i, flora.animation.rotation, flora.animation.wind
        )

    # Build the quad geometry for each flora sample.
    for sample in samples:
        quad_vertices = []
        transform = (
            sample.transform.translation
            @ sample.transform.scale
            @ sample.transform.rotation
        )
        for vertex in sample.geometry.vertices:
            rotated_vertex = transform_vertex(vertex, transform)
            quad_vertices.append(
                cpp.florae.QuadVertex(
                    rotated_vertex.position,
                    rotated_vertex.normal,
                    rotated_vertex.uv,
                    rev_textures[
                        sample.material.textures[
                            int(rotated_vertex.texture_index)
                        ]
                    ],
                    0,
                )
            )

        index_builder.add_quads(
            rev_samples[sample],
            cpp.florae.Quads(quad_vertices, sample.geometry.indices),
        )

    index = t.FloraIndex(
        impl=index_builder.build(),
        florae=copy.deepcopy(florae),
        textures=textures,
    )
    # Update quad texture indices to be global indices that we can use in `to_item_mesh`.
    # Need to use the set because samples seem to share geometries, which breaks this update loop.
    updated_geometries = set()
    for flora in index.florae.values():
        for sample in flora.samples:
            if id(sample.geometry) in updated_geometries:
                continue
            updated_geometries.add(id(sample.geometry))
            for vertex in sample.geometry.vertices:
                vertex.texture_index = rev_textures[
                    sample.material.textures[int(vertex.texture_index)]
                ]
    return index


def to_geometry_buffer(
    tensor: t.FloraTensor, growth: t.GrowthTensor, index: t.FloraIndex
):
    return t.FloraGeometryBuffer(
        impl=cpp.florae.to_geometry(tensor.impl, growth.impl, index.impl)
    )


def to_atlas(index: t.FloraIndex):
    return t.FloraAtlas(
        colors=build_atlas([texture.data for texture in index.textures])
    )


def transform_vertex(
    vertex: t.FloraVertex,
    transform: affine_transforms.AffineTransform,
):
    def do_transform(v, transform):
        transformed = transform.dot(np.array(v + (1,)))
        transformed /= transformed[3]
        return transformed[:3]

    transformed_vertex = do_transform(vertex.position, transform)
    transformed_normal = do_transform(
        vertex.normal, affine_transforms.remove_translation(transform)
    )
    transformed_normal /= np.linalg.norm(transformed_normal)

    return t.FloraVertex(
        list(transformed_vertex),
        list(transformed_normal),
        vertex.uv,
        vertex.texture_index,
    )


def to_item_mesh(flora: int, index: t.FloraIndex):
    sample = index.florae[flora].samples[0]
    vertices = [
        list(vertex.position)
        + list(vertex.normal)
        + list(vertex.uv)
        + [vertex.texture_index]
        for vertex in sample.geometry.vertices
    ]
    indices = list(sample.geometry.indices)

    return t.FloraItemMesh(
        vertices=t.ArrayData(
            np.array(
                vertices,
                np.float32,
            )
        ),
        indices=t.ArrayData(
            np.array(
                indices,
                np.uint32,
            )
        ),
    )
