"""Definitions/methods to help create and modify glTF files/objects in Galois."""

import base64
import copy
import hashlib
import io
from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Tuple, TypeVar, Union

import numpy as np
import numpy.typing as npt
import pygltflib
from impl import affine_transforms, poses, repo
from impl import types as t

from impl.files import path_to_content

T = TypeVar("T")


# Super useful method for dealing with glTF files, since everything
# is referenced from its index in a list.
def append_index(l: List[T], x: T):
    l.append(x)
    return (x, len(l) - 1)


# Buffers are the largest pieces of data in glTF files, so we want to avoid
# duplicating them whenever possible. This class helps with that by
# hashing them and returning cached versions if available when new
# buffers are to be created.
class CachedBuffers:
    def __init__(self, gltf_object: pygltflib.GLTF2):
        self.buffers: Dict[bytes, (pygltflib.Buffer, int)] = {}
        self.gltf_object = gltf_object

    def add(self, buffer: pygltflib.Buffer):
        assert buffer.uri != None
        assert buffer.byteLength != None

        def hash_buffer(b: pygltflib.Buffer):
            hash = hashlib.sha256()
            hash.update(buffer.uri.encode())
            hash.update(str(buffer.byteLength).encode())
            return hash.digest()

        hash = hash_buffer(buffer)

        cached = self.buffers.get(hash)
        if cached:
            return cached
        else:
            added = append_index(
                self.gltf_object.buffers, copy.deepcopy(buffer)
            )
            self.buffers[hash] = added
            return added


def bytes_to_gltf_uri(x: bytes):
    base64_data = base64.b64encode(x).decode()
    return f"{pygltflib.DATA_URI_HEADER}{base64_data}"


def numpy_buffer_to_gltf_buffer(x: np.array):
    buffer_bytes = x.tobytes()
    return pygltflib.Buffer(
        uri=bytes_to_gltf_uri(buffer_bytes),
        byteLength=len(buffer_bytes),
    )


@dataclass
class GLTFMesh:
    # The mesh is stored as a GLTF2, however the GLTF has a particular format
    # where it contains only nodes that either have only a single child, or refer
    # to a mesh (so there will always be exactly one mesh).
    gltf: pygltflib.GLTF2


# Maps a list of meshes to joints on a skeleton.
MeshJointMapData = List[Tuple[GLTFMesh, str]]


@dataclass
class MeshJointMap:
    skeleton: poses.Skeleton
    # List of pairs listing meshes and the skeleton joint that they are
    # attached to.
    mesh_joint_pairs: MeshJointMapData


@dataclass
class SkinnedMeshJointMap:
    skeleton: poses.Skeleton
    mesh: GLTFMesh
    # Index in the array indicates which joint index is embedded into the
    # vertex data for the specified joint name.
    joint_nodes: List[str]
    inverse_bind_matrices: List[npt.NDArray]


def convert_gltf_mesh_to_gltf(gltf_mesh: GLTFMesh):
    # A GLTFMesh actually already contains a self contained GLTF object, which
    # is valid, so just return that.
    return gltf_mesh.gltf


# Converts a voxel mesh to a GLTF mesh.
def convert_mesh_to_gltf_mesh(mesh: t.VoxelMesh) -> GLTFMesh:
    return make_mesh_from_numpy_arrays(
        {
            "POSITION": mesh.geometry.vertices.data[:, 0:3],
        },
        mesh.geometry.indices.data,
    )["mesh"]


@dataclass
class VertexAttributeDescriptor:
    name: str
    start: int
    stop: int
    type: Optional[np.uint8]
    multiplier: int = 1


def convert_vox_mesh_to_gltf_mesh(
    mesh: t.VoxMesh,
    vertex_attributes: Optional[List[VertexAttributeDescriptor]] = None,
    name: Optional[str] = None,
) -> GLTFMesh:
    if vertex_attributes is None:
        vertex_attributes = [
            VertexAttributeDescriptor(
                name="POSITION", start=0, stop=3, type=np.float32
            ),
            VertexAttributeDescriptor(
                name="COLOR_0", start=6, stop=10, multiplier=255, type=np.uint8
            ),
        ]

    return make_mesh_from_numpy_arrays(
        {
            x.name: (
                mesh.geometry.vertices.data[:, x.start : x.stop] * x.multiplier
            ).astype(x.type)
            for x in vertex_attributes
        },
        mesh.geometry.indices.data,
        mesh.transform,
        name=f"{name}_mesh",
    )


NP_TYPE_TO_GLTF_COMPONENT_TYPE = {
    np.dtype("float64"): pygltflib.FLOAT,
    np.dtype("float32"): pygltflib.FLOAT,
    np.dtype("uint8"): pygltflib.UNSIGNED_BYTE,
    np.dtype("uint16"): pygltflib.UNSIGNED_SHORT,
    np.dtype("uint32"): pygltflib.UNSIGNED_INT,
}


def add_vertex_attribute(
    gltf: pygltflib.GLTF2,
    cached_buffers: CachedBuffers,
    attribute_name: str,
    attribute_data: npt.NDArray,
):
    for mesh in gltf.meshes:
        assert len(mesh.primitives) == 1
        primitive = mesh.primitives[0]
        assert getattr(primitive.attributes, attribute_name) == None

        ARRAY_SIZE_TO_TYPE = {
            1: pygltflib.SCALAR,
            2: pygltflib.VEC2,
            3: pygltflib.VEC3,
            4: pygltflib.VEC4,
        }

        buffer_accessor_i = buffer_from_numpy_array(
            gltf,
            cached_buffers,
            attribute_data,
            component_type=NP_TYPE_TO_GLTF_COMPONENT_TYPE[attribute_data.dtype],
            type=ARRAY_SIZE_TO_TYPE[attribute_data.shape[1]],
            target=pygltflib.ARRAY_BUFFER,
            normalized=(
                attribute_name == "COLOR_0" or attribute_name == "WEIGHTS_0"
            ),
        )

        setattr(primitive.attributes, attribute_name, buffer_accessor_i)


def make_mesh_from_numpy_arrays(
    primitive_attributes: Dict[str, npt.NDArray],
    indices: npt.NDArray,
    transform: Optional[affine_transforms.AffineTransform] = None,
    name: Optional[str] = None,
):
    gltf_object = pygltflib.GLTF2()
    mesh_buffers = CachedBuffers(gltf_object)

    (
        primitive_attributes["POSITION"],
        vertex_compress_translate,
    ) = compress_position_buffer(primitive_attributes["POSITION"])

    max_indices = np.max(indices)
    if max_indices <= 255:
        indices = indices.astype(np.uint8)
    elif max_indices <= 65535:
        indices = indices.astype(np.uint16)

    index_accessor_i = buffer_from_numpy_array(
        gltf_object,
        mesh_buffers,
        indices[:, np.newaxis],
        component_type=NP_TYPE_TO_GLTF_COMPONENT_TYPE[indices.dtype],
        type=pygltflib.SCALAR,
        target=pygltflib.ELEMENT_ARRAY_BUFFER,
    )

    # By default assign a metallic factor of 0 to all the meshes coming out
    # of here.... Certainly is something we'll likely want to parameterize later
    # though.
    _, material_i = append_index(
        gltf_object.materials,
        pygltflib.Material(
            pbrMetallicRoughness=pygltflib.PbrMetallicRoughness(
                # Setting this to 0 removes a factor from the material that
                # would otherwise significantly decrease the brightness.
                metallicFactor=0,
            )
        ),
    )
    _, mesh_i = append_index(
        gltf_object.meshes,
        pygltflib.Mesh(
            primitives=[
                pygltflib.Primitive(
                    attributes=pygltflib.Attributes(),  # Will fill in later.
                    indices=index_accessor_i,
                    material=material_i,
                )
            ],
        ),
    )

    for k, v in primitive_attributes.items():
        add_vertex_attribute(gltf_object, mesh_buffers, k, v)

    if vertex_compress_translate:
        compress_transform = affine_transforms.from_translation(
            vertex_compress_translate
        )
        if transform is not None:
            transform = affine_transforms.from_list(
                [
                    transform,
                    compress_transform,
                ]
            )
        else:
            transform = compress_transform

    matrix = affine_to_gltf_matrix(transform) if transform is not None else None
    _, node_i = append_index(
        gltf_object.nodes,
        pygltflib.Node(name=name, mesh=mesh_i, matrix=matrix),
    )

    gltf_object.scene = 0
    gltf_object.scenes.append(pygltflib.Scene(nodes=[node_i]))

    return {"mesh": GLTFMesh(gltf_object), "transform": transform}


# If possible, compresses the vertex data. Since we know we're likely dealing
# with input voxel data, we look to see if a) all our vertex coordinates are
# integers and b) if they fit within the range of 256 or 65536, in which case
# they could be compressed into uint8 or uint16 arrays instead of float arrays.
def compress_position_buffer(
    positions: npt.NDArray,
):
    # Check if our positions are specified at integer coordinates. If not,
    # we can't really proceed so return as is.
    max_distance_from_integer = np.max(np.abs(positions % 1))
    if max_distance_from_integer > 0.0001:
        return positions, None

    min = np.amin(positions, axis=0)
    max = np.amax(positions, axis=0)
    range = max - min
    max_range = np.max(range)

    if max_range <= 255:
        target_type = np.uint8
    elif max_range <= 65535:
        target_type = np.uint16
    else:
        # Range of vertices is large, no opportunity to compress.
        return positions, None

    compressed = (positions - min).astype(target_type)

    return compressed, min.tolist()


# Returns the index of an accessor pointing to the buffer data.
def buffer_from_numpy_array(
    gltf_object: pygltflib.GLTF2,
    cached_buffers: CachedBuffers,
    numpy_array,
    component_type,
    type,
    target=None,
    normalized=False,
):
    # Pad out the numpy array width such that its stride is a multiple of 4.
    stride_padded_numpy_array = numpy_array
    stride = None
    if target == pygltflib.ARRAY_BUFFER:
        pad_amount = 0
        while True:
            stride = (pad_amount + numpy_array.shape[1]) * numpy_array.itemsize
            if stride % 4 == 0:
                break
            pad_amount += 1
        assert stride % 4 == 0
        if pad_amount > 0:
            stride_padded_numpy_array = np.pad(
                numpy_array, ((0, 0), (0, pad_amount))
            )

    vertex_position_buffer, vertex_position_buffer_i = cached_buffers.add(
        numpy_buffer_to_gltf_buffer(stride_padded_numpy_array)
    )

    _, vertex_position_buffer_view_i = append_index(
        gltf_object.bufferViews,
        pygltflib.BufferView(
            buffer=vertex_position_buffer_i,
            byteStride=stride,
            byteLength=vertex_position_buffer.byteLength,
            target=target,
        ),
    )
    _, vertex_position_accessor_i = append_index(
        gltf_object.accessors,
        pygltflib.Accessor(
            bufferView=vertex_position_buffer_view_i,
            componentType=component_type,
            type=type,
            count=numpy_array.shape[0],
            min=np.amin(numpy_array, axis=0).tolist(),
            max=np.amax(numpy_array, axis=0).tolist(),
            normalized=normalized,
        ),
    )

    return vertex_position_accessor_i


def transform_gltf_affine(
    gltf: GLTFMesh, transform: affine_transforms.AffineTransform
):
    new_gltf = copy.deepcopy(gltf)
    for i, n in enumerate(new_gltf.scenes[0].nodes):
        new_node, new_node_i = append_index(
            new_gltf.nodes,
            pygltflib.Node(
                children=[n],
                matrix=affine_to_gltf_matrix(transform),
            ),
        )
        new_gltf.scenes[0].nodes[i] = new_node_i

    return new_gltf


def transform_gltf(gltf: pygltflib.GLTF2, transform: poses.Transform):
    new_gltf = copy.deepcopy(gltf)
    for i, n in enumerate(new_gltf.scenes[0].nodes):
        new_node, new_node_i = append_index(
            new_gltf.nodes,
            pygltflib.Node(
                children=[n],
                translation=transform.translation,
                rotation=transform.rotation,
                scale=transform.scale,
            ),
        )
        new_gltf.scenes[0].nodes[i] = new_node_i

    return new_gltf


def transform_gltf_mesh(gltf_mesh: GLTFMesh, transform: poses.Transform):
    new_gltf_mesh = copy.deepcopy(gltf_mesh)
    root_node_i = len(new_gltf_mesh.gltf.nodes) - 1
    new_root, new_root_i = append_index(
        new_gltf_mesh.gltf.nodes,
        pygltflib.Node(
            children=[root_node_i],
            translation=transform.translation,
            rotation=transform.rotation,
            scale=transform.scale,
        ),
    )
    new_gltf_mesh.gltf.scenes[0].nodes[0] = new_root_i
    return new_gltf_mesh


# Copy over information from our mesh GLTF2 object containing only
# information about a single mesh, into the provided `gltf_object`,
# and return the node index that refers to the newly added mesh.
def add_gltf_mesh(
    gltf_object: pygltflib.GLTF2,
    mesh_buffers: CachedBuffers,
    gltf_mesh: GLTFMesh,
):
    # Copy the buffers over.
    buffer_map: Dict[int, int] = {}
    for i, buffer in enumerate(gltf_mesh.gltf.buffers):
        buffer_map[i] = mesh_buffers.add(buffer)[1]
    # Copy the buffer views over.
    buffer_view_map: Dict[int, int] = {}
    for i, buffer_view in enumerate(gltf_mesh.gltf.bufferViews):
        new_buffer_view, new_buffer_view_i = append_index(
            gltf_object.bufferViews, copy.deepcopy(buffer_view)
        )
        new_buffer_view.buffer = buffer_map[new_buffer_view.buffer]
        buffer_view_map[i] = new_buffer_view_i
    # Copy the accessors over.
    accessor_map: Dict[int, int] = {}
    for i, accessor in enumerate(gltf_mesh.gltf.accessors):
        new_accessor, new_accessor_i = append_index(
            gltf_object.accessors, copy.deepcopy(accessor)
        )
        new_accessor.bufferView = buffer_view_map[new_accessor.bufferView]
        accessor_map[i] = new_accessor_i
    # Copy the material over.
    material_map: Dict[int, int] = {}
    for i, material in enumerate(gltf_mesh.gltf.materials):
        _, new_material_i = append_index(
            gltf_object.materials, copy.deepcopy(material)
        )
        material_map[i] = new_material_i
    # Copy the mesh over.
    assert len(gltf_mesh.gltf.meshes) == 1
    new_mesh, new_mesh_i = append_index(
        gltf_object.meshes, copy.deepcopy(gltf_mesh.gltf.meshes[0])
    )
    for primitive in new_mesh.primitives:

        def map_attribute_index(i):
            if i == None:
                return None
            return accessor_map[i]

        primitive.attributes = pygltflib.Attributes(
            **{
                k: map_attribute_index(v)
                for k, v in primitive.attributes.__dict__.items()
            }
        )
        primitive.indices = accessor_map[primitive.indices]
        primitive.material = material_map[primitive.material]

    # Copy the nodes over.
    node_map: Dict[int, int] = {}
    for i, node in enumerate(gltf_mesh.gltf.nodes):
        new_node, new_node_i = append_index(
            gltf_object.nodes, copy.deepcopy(node)
        )
        if new_node.children:
            assert len(new_node.children) == 1
            assert not new_node.mesh
            # We assume that nodes were inserted into the GLTF2 object in
            # "root-last" order, so every node we encounter will already have
            # had its child copied over.
            new_node.children[0] = node_map[new_node.children[0]]
        if new_node.mesh != None:
            assert not new_node.children
            # There should only have been one mesh in the mesh GLTF.
            assert new_node.mesh == 0
            new_node.mesh = new_mesh_i
        node_map[i] = new_node_i

    return node_map[len(gltf_mesh.gltf.nodes) - 1]


def add_gltf_node(
    gltf_object: pygltflib.GLTF2,
    name: str,
    child_node_indices: List[int],
    transform: poses.Transform,
):
    return append_index(
        gltf_object.nodes,
        pygltflib.Node(
            name=name,
            children=child_node_indices,
            translation=transform.translation,
            rotation=transform.rotation,
            scale=transform.scale,
        ),
    )[1]


def make_gltf_from_static_meshes(gltf_meshes: List[GLTFMesh]):
    gltf_object = pygltflib.GLTF2()
    mesh_buffers = CachedBuffers(gltf_object)
    mesh_node_indices: List[int] = []
    for gltf_mesh in gltf_meshes:
        mesh_node_indices.append(
            add_gltf_mesh(gltf_object, mesh_buffers, gltf_mesh)
        )

    _, root_node_i = append_index(
        gltf_object.nodes,
        pygltflib.Node(name="root", children=mesh_node_indices),
    )
    _, scene_i = append_index(
        gltf_object.scenes, pygltflib.Scene(nodes=[root_node_i])
    )
    gltf_object.scene = scene_i
    return gltf_object


def add_joint_meshes_to_gltf(
    gltf_object: pygltflib.GLTF2, mesh_joint_map: MeshJointMap
):
    # Add the meshes to the glTF object.
    joint_to_mesh_node_lookup = {}
    mesh_buffers = CachedBuffers(gltf_object)
    for mesh, joint in mesh_joint_map.mesh_joint_pairs:
        if joint not in joint_to_mesh_node_lookup:
            joint_to_mesh_node_lookup[joint] = append_index(
                gltf_object.nodes,
                pygltflib.Node(
                    name=f"{joint}_meshes",
                ),
            )
        joint_node, _ = joint_to_mesh_node_lookup[joint]

        joint_node.children.append(
            add_gltf_mesh(gltf_object, mesh_buffers, mesh)
        )

    return {k: v[1] for k, v in joint_to_mesh_node_lookup.items()}


def add_posed_joint_nodes_to_gltf(
    gltf_object: pygltflib.GLTF2,
    extra_children: Dict[str, int],
    pose: poses.Pose,
):
    # Add the nodes to the glTF object based on their pose transforms and
    # skeleton hierarchy.
    def skeleton_depth_first_foreach(
        s: poses.Skeleton, func: Callable[[poses.Skeleton], None]
    ):
        for child in s[1]:
            skeleton_depth_first_foreach(child, func)
        func(s)

    joint_to_node_lookup: Dict[str, int] = {}

    def add_joint_node(s: poses.Skeleton):
        name = s[0]
        transform = pose.joint_transforms[name]
        child_node_indices = [joint_to_node_lookup[child[0]] for child in s[1]]
        associated_mesh_node = extra_children.get(name)
        joint_to_node_lookup[name] = add_gltf_node(
            gltf_object,
            name,
            child_node_indices
            + (
                [associated_mesh_node]
                if associated_mesh_node is not None
                else []
            ),
            transform,
        )

    skeleton_depth_first_foreach(pose.skeleton, add_joint_node)
    return joint_to_node_lookup


def create_static_gltf_from_mesh_joint_map(
    mesh_joint_map: MeshJointMap, pose: poses.Pose
):
    check_skeleton(mesh_joint_map, pose, [])

    gltf_object = pygltflib.GLTF2()
    joint_to_mesh_node_lookup = add_joint_meshes_to_gltf(
        gltf_object, mesh_joint_map
    )

    return gltf_object, add_gltf_nodes_for_pose(
        gltf_object, joint_to_mesh_node_lookup, pose
    )


def add_gltf_nodes_for_pose(
    gltf_object: pygltflib.GLTF2,
    extra_node_children: Dict[str, int],
    pose: poses.Pose,
):
    joint_to_node_lookup = add_posed_joint_nodes_to_gltf(
        gltf_object, extra_node_children, pose
    )

    # Setup our scene to point to the node associated with the skeleton's root.
    root_node = joint_to_node_lookup[pose.skeleton[0]]
    for ancestor_node in reversed(pose.skeleton_transform_ancestor_chain):
        _, root_node = append_index(
            gltf_object.nodes,
            pygltflib.Node(
                name=ancestor_node[0],
                children=[root_node],
                translation=ancestor_node[1].translation,
                scale=ancestor_node[1].scale,
                rotation=ancestor_node[1].rotation,
            ),
        )

    if len(gltf_object.scenes) > 0:
        gltf_object.scenes[0].nodes.append(root_node)
    else:
        _, scene_i = append_index(
            gltf_object.scenes, pygltflib.Scene(nodes=[root_node])
        )

        gltf_object.scene = scene_i

    return joint_to_node_lookup


# Ensures the skeleton is consistent between all input data, and returns that
# skeleton.
def check_skeleton(
    mesh_joint_map: Union[MeshJointMap, SkinnedMeshJointMap],
    pose: poses.Pose,
    animation_list: List[poses.Animation],
):
    skeleton = mesh_joint_map.skeleton
    if not poses.skeletons_equal(skeleton, pose.skeleton):
        raise ValueError(
            "Skeletons do not match between the MeshJointMap and the Pose."
        )
    for a in animation_list:
        if not poses.skeletons_equal(skeleton, a.skeleton):
            raise ValueError(
                f"Skeletons do not match between the MeshJointMap and the animation '{a.animation.name}'."
            )
    return skeleton


def add_animations_to_gltf(
    gltf_object: pygltflib.GLTF2,
    joint_to_node_lookup: Dict[str, int],
    animation_list: List[poses.Animation],
):
    # Keep a cache of copied buffers so we don't copy more than we need to.
    cached_buffers = CachedBuffers(gltf_object)

    for animation in animation_list:
        new_animation, _ = append_index(
            gltf_object.animations,
            pygltflib.Animation(name=animation.animation.name),
        )

        def copy_accessor_chain(accessor_i: int):
            source_accessor = animation.gltf.accessors[accessor_i]
            source_buffer_view = animation.gltf.bufferViews[
                source_accessor.bufferView
            ]
            _, buffer_i = cached_buffers.add(
                animation.gltf.buffers[source_buffer_view.buffer]
            )

            buffer_view, buffer_view_i = append_index(
                gltf_object.bufferViews, copy.deepcopy(source_buffer_view)
            )
            buffer_view.buffer = buffer_i
            accessor, accessor_i = append_index(
                gltf_object.accessors, copy.deepcopy(source_accessor)
            )
            accessor.bufferView = buffer_view_i

            return accessor_i

        for sampler in animation.animation.samplers:
            append_index(
                new_animation.samplers,
                pygltflib.Sampler(
                    interpolation=sampler.interpolation,
                    input=copy_accessor_chain(sampler.input),
                    output=copy_accessor_chain(sampler.output),
                    wrapS=None,
                    wrapT=None,
                ),
            )

        for channel in animation.animation.channels:
            if (
                animation.gltf.nodes[channel.target.node].name
                not in joint_to_node_lookup
            ):
                continue
            append_index(
                new_animation.channels,
                pygltflib.AnimationChannel(
                    sampler=channel.sampler,
                    target=pygltflib.AnimationChannelTarget(
                        node=joint_to_node_lookup[
                            animation.gltf.nodes[channel.target.node].name
                        ],
                        path=channel.target.path,
                    ),
                ),
            )


def create_animated_gltf_from_skinned_mesh_joint_map(
    mesh_joint_map: SkinnedMeshJointMap,
    initial_pose: poses.Pose,
    animation_list: List[poses.Animation],
):
    check_skeleton(mesh_joint_map, initial_pose, animation_list)

    # Now add our animations.
    gltf = copy.deepcopy(mesh_joint_map.mesh.gltf)
    joint_to_node_lookup = add_gltf_nodes_for_pose(gltf, {}, initial_pose)

    add_animations_to_gltf(gltf, joint_to_node_lookup, animation_list)

    # Now add the skin section to the GLTF.
    cached_buffers = CachedBuffers(gltf)
    buffer_accessor_i = buffer_from_numpy_array(
        gltf,
        cached_buffers,
        np.vstack(
            [x.T.flatten() for x in mesh_joint_map.inverse_bind_matrices]
        ).astype(np.float32),
        component_type=NP_TYPE_TO_GLTF_COMPONENT_TYPE[
            mesh_joint_map.inverse_bind_matrices[0].dtype
        ],
        type=pygltflib.MAT4,
        normalized=False,
    )

    gltf.skins = [
        pygltflib.Skin(
            joints=[
                joint_to_node_lookup[x] for x in mesh_joint_map.joint_nodes
            ],
            inverseBindMatrices=buffer_accessor_i,
        )
    ]

    return gltf


def create_animated_gltf_from_mesh_joint_map(
    mesh_joint_map: MeshJointMap,
    initial_pose: poses.Pose,
    animation_list: List[poses.Animation],
):
    check_skeleton(mesh_joint_map, initial_pose, animation_list)

    gltf_object, joint_to_node_lookup = create_static_gltf_from_mesh_joint_map(
        mesh_joint_map, initial_pose
    )

    # Now add our animations.
    add_animations_to_gltf(gltf_object, joint_to_node_lookup, animation_list)

    return gltf_object


def affine_to_gltf_matrix(transform: affine_transforms.AffineTransform):
    return transform.transpose().flatten().tolist()


def add_node_to_gltf(
    gltf: pygltflib.GLTF2,
    node_name: str,
    parent_node_name: str,
    transform: affine_transforms.AffineTransform,
):
    gltf_with_new_node = copy.deepcopy(gltf)
    # Search for the parent node within the scene.
    parent_nodes = [
        (i, x)
        for (i, x) in enumerate(gltf_with_new_node.nodes)
        if x.name == parent_node_name
    ]
    if len(parent_nodes) < 1:
        raise ValueError(f"Could not find parent node '{parent_node_name}'")
    if len(parent_nodes) > 1:
        raise ValueError(
            f"Found multiple nodes with the name '{parent_node_name}'"
        )

    parent_node = parent_nodes[0][1]

    _, new_node_i = append_index(
        gltf_with_new_node.nodes,
        pygltflib.Node(name=node_name, matrix=affine_to_gltf_matrix(transform)),
    )

    parent_node.children = parent_node.children + [new_node_i]

    return gltf_with_new_node


def serialize_to_glb(gltf: pygltflib.GLTF2):
    glb_structure = gltf.save_to_bytes()
    if not glb_structure:
        raise ValueError("Error serializing GLTF to GLB bytes.")

    with io.BytesIO() as output:
        for data in glb_structure:
            output.write(data)
        return output.getvalue()


def load_gltf(path: str):
    return pygltflib.GLTF2().gltf_from_json(path_to_content(path))


def load_glb(path: str):
    return pygltflib.GLTF2().load_from_bytes(path_to_content(path))


def remove_mesh_node_names(gltf: pygltflib.GLTF2):
    gltf_with_new_node = copy.deepcopy(gltf)

    for node in gltf_with_new_node.nodes:
        if node.mesh is not None:
            node.name = None

    return gltf_with_new_node
