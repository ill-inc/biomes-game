"""Galois support for glTF-based skeleton/animation/posing data in Galois."""

import copy
from dataclasses import asdict, dataclass, field
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import numpy.typing as npt
import pygltflib

from impl import types as t
from impl.quaternions import Quaternion, quat_to_matrix

Skeleton = Tuple[str, List["Skeleton"]]


def skeletons_equal(a: Skeleton, b: Skeleton):
    return a == b


def flatmap(f, elements):
    return [x for p in elements for x in f(p)]


@dataclass
class Transform:
    Translation = Tuple[float, float, float]
    translation: Optional[Translation] = None
    # Represented as a quaternion.
    rotation: Optional[Quaternion] = None
    Scale = Tuple[float, float, float]
    scale: Optional[Scale] = None

    def to_numpy_affine(self):
        # The correct ordering for the transformations is `M = T * R * S`
        #   https://github.com/KhronosGroup/glTF-Tutorials/blob/master/gltfTutorial/gltfTutorial_004_ScenesNodes.md
        S = np.diag(list(self.scale) + [1]) if self.scale else np.identity(4)
        R = np.identity(4)
        if self.rotation:
            R[:3, :3] = quat_to_matrix(self.rotation)
        T = np.identity(4)
        if self.translation:
            T[:3, -1] = self.translation

        return np.matmul(T, np.matmul(R, S))


@dataclass
class Pose:
    skeleton: Skeleton
    # There should be one entry for each joint of the skeleton.
    joint_transforms: Dict[str, Transform] = field(default_factory=dict)

    # The chain of ancestors, between the scene root and the skeleton root,
    # starting from the scene root node. This is useful for reconstructing
    # the skeleton root transform found in the source glTF file.
    skeleton_transform_ancestor_chain: List[Tuple[str, Transform]] = field(
        default_factory=list
    )

    def __str__(self):
        return f"Pose(num skeleton joints={len(get_list_of_skeleton_nodes(self.skeleton))}, joint_transforms.keys()={list(self.joint_transforms.keys())})"

    def __repr__(self):
        return self.__str__()


@dataclass
class Animation:
    skeleton: Skeleton

    # Because animations reference nodes and accessors, which in turn reference
    # bufferViews, which in turn reference buffers, we just store the whole
    # GLTF2 object here for now, and in the future, as needed, we can look into
    # making this more independent.
    gltf: pygltflib.GLTF2

    # There should be one entry for each joint of the skeleton.
    animation: pygltflib.Animation

    def __str__(self):
        return f"Animation(num skeleton joints={len(get_list_of_skeleton_nodes(self.skeleton))}, name={self.animation.name})"

    def __repr__(self):
        return self.__str__()


def get_skeleton_node(root: Skeleton, name: str):
    if root[0] == name:
        return root
    for child in root[1]:
        node = get_skeleton_node(child, name)
        if node:
            return node
    return None


def get_list_of_skeleton_nodes(skeleton: Skeleton):
    return [skeleton] + [
        x for child in skeleton[1] for x in get_list_of_skeleton_nodes(child)
    ]


def empty_pose_for_skeleton(skeleton: Skeleton):
    return Pose(
        skeleton,
        {x[0]: Transform() for x in get_list_of_skeleton_nodes(skeleton)},
    )


def flatten_pose(pose: Pose) -> npt.NDArray:
    def recursion_helper(
        skeleton_root: Skeleton, current_transform: npt.NDArray
    ) -> List[Tuple[str, npt.NDArray]]:
        current_transform = np.matmul(
            current_transform,
            pose.joint_transforms[skeleton_root[0]].to_numpy_affine(),
        )
        return [(skeleton_root[0], current_transform)] + flatmap(
            lambda r: recursion_helper(r, current_transform), skeleton_root[1]
        )

    root_transform = np.identity(4)
    for ancestor in pose.skeleton_transform_ancestor_chain:
        root_transform = np.matmul(
            root_transform, ancestor[1].to_numpy_affine()
        )
    pose_transform_pairs = recursion_helper(pose.skeleton, root_transform)
    return dict(pose_transform_pairs)


def gltf_node_to_transform(node: pygltflib.Node):
    t = Transform()

    if node.translation:
        t.translation = [
            node.translation[0],
            node.translation[1],
            node.translation[2],
        ]

    if node.rotation:
        t.rotation = [
            node.rotation[0],
            node.rotation[1],
            node.rotation[2],
            node.rotation[3],
        ]

    if node.scale:
        t.scale = [node.scale[0], node.scale[1], node.scale[2]]

    return t


def transform_pose(pose: Pose, transform: Transform):
    new_pose = copy.deepcopy(pose)
    new_pose.skeleton_transform_ancestor_chain.insert(
        0, ("galoisGlobalTransform", transform)
    )
    return new_pose


def validate_skeleton_node_matches_gltf_node(
    skeleton_node: Skeleton, gltf_node: pygltflib.Node, gltf: pygltflib.GLTF2
):
    if skeleton_node[0] != gltf_node.name:
        raise ValueError(
            f"Skeleton node '{skeleton_node[0]}' has different name than glTF node '{gltf_node.name}'"
        )

    children_required_names = set([x[0] for x in skeleton_node[1]])
    for gltf_child_index in gltf_node.children:
        gltf_child = gltf.nodes[gltf_child_index]
        if gltf_child.name in children_required_names:
            children_required_names.remove(gltf_child.name)

    if children_required_names:
        raise ValueError(
            f"glTF node '{gltf_node.name}' does not have the following expected children: {list(children_required_names)}"
        )


def load_initial_pose_from_gltf(gltf: pygltflib.GLTF2, skeleton: Skeleton):
    # Load the default pose out of glTF file and return it.
    pose = Pose(skeleton=skeleton)
    for n in gltf.nodes:
        skeleton_node = get_skeleton_node(skeleton, n.name)
        # This node doesn't match with known skeleton nodes, so ignore it.
        if not skeleton_node:
            continue
        # Ignore nodes that have meshes associated with them, we don't really
        # consider them bones.
        if n.mesh != None:
            continue
        validate_skeleton_node_matches_gltf_node(skeleton_node, n, gltf)
        pose.joint_transforms[n.name] = gltf_node_to_transform(n)

    missing_joint_names = []
    skeleton_node_names = [x[0] for x in get_list_of_skeleton_nodes(skeleton)]
    for skeleton_node_name in skeleton_node_names:
        if skeleton_node_name not in pose.joint_transforms:
            missing_joint_names.append(skeleton_node_name)

    if missing_joint_names:
        raise ValueError(
            f"No pose information for the following skeleton joints: {missing_joint_names}"
        )

    def get_ancestor_chains(
        node_root: pygltflib.Node, target_node_name: str
    ) -> List[List[pygltflib.Node]]:
        if node_root.name == target_node_name:
            # A list of the empty list means the skeleton is found with an empty chain.
            return [[]]

        def foreach_child_index(child_index):
            child = gltf.nodes[child_index]
            return [
                [node_root] + x
                for x in get_ancestor_chains(child, target_node_name)
            ]

        return flatmap(foreach_child_index, node_root.children)

    # Find the path between the scene root of the initial pose, and the
    # skeleton's root. We'll store this so that we can remember the skeleton's
    # global transform within the initial pose.
    scene_root = (
        gltf.scenes[gltf.scene] if gltf.scene != None else gltf.scenes[0]
    )
    paths = flatmap(
        lambda x: get_ancestor_chains(gltf.nodes[x], skeleton[0]),
        scene_root.nodes,
    )
    if len(paths) > 1:
        raise ValueError(
            "Did not expect to find multiple references of the skeleton within the input glTF scene, not sure which global transform to use."
        )
    if paths:
        ancestor_path = paths[0]
        pose.skeleton_transform_ancestor_chain = [
            (x.name, gltf_node_to_transform(x)) for x in ancestor_path
        ]

    return pose


def load_animation_from_gltf(
    destination_name: str,
    source_name: str,
    gltf: pygltflib.GLTF2,
    skeleton: Skeleton,
):
    def find_animation():
        for a in gltf.animations:
            if a.name == source_name:
                return a
        return None

    animation = find_animation()
    if not animation:
        raise ValueError(f"Could not find animation {source_name} in glTF.")

    # Verify that the animation only operates on nodes that exist within the skeleton.
    skeleton_node_names = set(
        [x[0] for x in get_list_of_skeleton_nodes(skeleton)]
    )
    skeleton_nodes_referenced = []
    non_skeleton_nodes_referenced = []
    for channel in animation.channels:
        node = gltf.nodes[channel.target.node]
        if node.name in skeleton_node_names:
            skeleton_nodes_referenced.append(node.name)
        else:
            non_skeleton_nodes_referenced.append(node.name)
    if not skeleton_nodes_referenced:
        raise ValueError(
            f"The animation {source_name} does not reference any joints defined in the skeleton."
        )

    animation = copy.deepcopy(animation)
    animation.name = destination_name

    return Animation(skeleton, gltf, animation)


def load_animations_from_gltf(
    gltf: pygltflib.GLTF2,
    skeleton: Skeleton,
):
    animations: List[Animation] = []
    for gltf_animation in gltf.animations:
        if not gltf_animation.name:
            continue
        animation = load_animation_from_gltf(
            gltf_animation.name, gltf_animation.name, gltf, skeleton
        )
        if animation:
            animations.append(animation)

    return animations
