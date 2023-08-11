import copy
from collections import defaultdict
from dataclasses import dataclass
from functools import reduce
import base64
from itertools import product
from typing import Dict, List, Optional, Set, Tuple

import numpy as np
import numpy.typing as npt
from impl import color_palettes, gltf
from impl import maps as maps
from impl import meshes as meshes
from impl import poses, render_voxels
from impl import types as t
from impl import vox_parsing as vox_parsing
from impl.repo import open_file


@dataclass
class VoxMap:
    table: maps.Table[vox_parsing.Color]


# It's "posed" because the meshes associated with each joint are transformed
# according to some reference pose, which we don't know just yet.
@dataclass
class PosedVoxJointMap:
    skeleton: poses.Skeleton
    vox_joint_pairs: List[Tuple[VoxMap, str]]


def load_from_bytes(contents: bytes) -> vox_parsing.Vox:
    return vox_parsing.parse_vox(contents)


def replace_palette_entries(
    start: int,
    end: int,
    new_colors: color_palettes.ColorPalette,
    vox_object: vox_parsing.Vox,
):
    replacement_colors = new_colors[2]
    num_replacements = end - start
    if num_replacements > len(replacement_colors):
        raise ValueError(
            f"Mismatch in the number of expected colors to replace in the palette. Got {len(replacement_colors)}, expected {num_replacements}."
        )

    new_vox_object = copy.copy(vox_object)
    new_vox_object.palette = copy.deepcopy(vox_object.palette)

    for i, destination_index in enumerate(range(start, end)):
        as_list = list(new_vox_object.palette[destination_index])
        as_list[:3] = replacement_colors[i]
        new_vox_object.palette[destination_index] = tuple(as_list)
    return new_vox_object


def remove_palette_entries(start: int, end: int, vox_object: vox_parsing.Vox):
    new_vox_object = copy.deepcopy(vox_object)
    for model in new_vox_object.models:
        for vi, voxel in enumerate(model.voxels):
            model.voxels[vi] = (
                voxel
                if voxel[3] < start or voxel[3] >= end
                else (voxel[0], voxel[1], voxel[2], 0)
            )

    return new_vox_object


def subtract_layer_voxels(vox_object: vox_parsing.Vox, layer_name: str):
    # Start by creating a set of all absolute position points from the specified
    # layer.
    voxel_positions_to_subtract: Set[Tuple[int, int, int]] = set()

    def add_voxels_to_subtract(sgm: vox_parsing.ModelWithAttributes):
        for voxel in sgm.model.voxels:
            transformed = vox_parsing.transform_point(
                (voxel[0], voxel[1], voxel[2]), sgm
            )
            voxel_positions_to_subtract.add(transformed)

    scene_graph_models = vox_object.get_scene_graph_model_list()
    for sgm in scene_graph_models:
        if sgm.layer.name == layer_name:
            add_voxels_to_subtract(sgm)

    if not voxel_positions_to_subtract:
        return vox_object

    # Now go through all models in the vox object and remove voxels that
    # correspond to voxel positions in the subtract layer.
    new_vox_object = copy.deepcopy(vox_object)
    for sgm in new_vox_object.get_scene_graph_model_list():
        for vi, voxel in enumerate(sgm.model.voxels):
            transformed = vox_parsing.transform_point(
                (voxel[0], voxel[1], voxel[2]), sgm
            )
            if transformed in voxel_positions_to_subtract:
                sgm.model.voxels[vi] = voxel[0], voxel[1], voxel[2], 0
    return new_vox_object


def vox_scene_to_vox_maps(vox_file_object: vox_parsing.Vox):
    vox_maps: List[VoxMap] = []
    if len(vox_file_object.root_nodes) > 0:
        # Create a VoxMap per object.
        vox_models_by_layer = get_visible_vox_maps_by_layer_name(
            vox_file_object
        )

        vox_maps = [
            vm for vm_list in vox_models_by_layer.values() for vm in vm_list
        ]
    else:
        if len(vox_file_object.models) != 1:
            raise ValueError(
                f"Expected a vox file that contains only a single model, this one contains {len(vox_file_object.models)}."
            )
        vox_maps = [
            vox_model_to_map(vox_file_object.models[0], vox_file_object.palette)
        ]

    return vox_maps


def vox_to_gltf(vox_file_object: vox_parsing.Vox):
    vox_maps = vox_scene_to_vox_maps(vox_file_object)

    return gltf.make_gltf_from_static_meshes(
        filter(
            lambda x: x != None,
            [
                gltf.convert_vox_mesh_to_gltf_mesh(to_mesh(vox_map))["mesh"]
                for vox_map in vox_maps
                if np.any(vox_map.table.map.values)
            ],
        )
    )


def empty_vox_map():
    return VoxMap(
        table=maps.Table[vox_parsing.Color](
            index={},
            map=maps.Map(
                origin=(
                    0,
                    0,
                    0,
                ),
                values=np.zeros([0, 0, 0], dtype=np.uint8),
            ),
        ),
    )


def vox_to_map(vox_file_object: vox_parsing.Vox) -> VoxMap:
    if len(vox_file_object.root_nodes) > 0:
        vox_maps = vox_scene_to_vox_maps(vox_file_object)
        if len(vox_maps) == 0:
            return empty_vox_map()

        return accumulate_vox_maps(vox_maps)

    if len(vox_file_object.models) != 1:
        raise ValueError(
            f"Expected a vox file that contains only a single model, this one contains {len(vox_file_object.models)}."
        )

    return vox_model_to_map(vox_file_object.models[0], vox_file_object.palette)


# This function *also* normalizes the color value (i.e. converts
# from 0-255 -> 0-1.), so that we don't lose precision.
def convert_srgb_to_linear(srgb: vox_parsing.Color):
    def convert_component_to_linear(c: int):
        # From https://entropymine.com/imageworsener/srgbformula/
        n = c / 255
        if n < 0.04045:
            return n / 12.92
        else:
            return pow((n + 0.055) / 1.055, 2.4)

    return tuple(
        [convert_component_to_linear(x) for x in srgb[:3]] + [srgb[3] / 255.0]
    )


def vox_model_to_map(
    vox_model: vox_parsing.Model,
    palette: vox_parsing.Palette,
    transform: Optional[vox_parsing.Transform] = None,
) -> VoxMap:
    if transform is None:
        transform = vox_parsing.Transform(
            translation=(0, 0, 0),
            rotation=vox_parsing.Rotation(
                axis_reordering=(0, 1, 2), scale=(1, 1, 1)
            ),
        )

    # Extract the voxel data as a numpy array, applying the rotation specifications while
    # we do it.
    array = np.flip(
        model_to_numpy(vox_model).transpose(transform.rotation.axis_reordering),
        [i for i, s in enumerate(transform.rotation.scale) if s == -1],
    ).transpose(
        [2, 1, 0]
    )  # Final transpose to convert to the Maps/numpy convention of (z,y,x).

    # Leave out 0 from our palette, maps.Table already expects 0 to mean
    # that the voxel is transparent.
    return VoxMap(
        table=maps.Table[vox_parsing.Color](
            index={
                # MagicaVoxel saves its colors in the srgb color space (e.g.
                # after gamma correction), but VoxMap (and more importantly, glTF)
                # expects these to be in the linear color space, so convert now.
                i: convert_srgb_to_linear(c)
                for i, c in enumerate(palette)
                if i != 0
            },
            map=maps.Map(
                origin=(
                    transform.translation[0],
                    transform.translation[1],
                    transform.translation[2],
                ),
                values=array,
            ),
        ),
    )


def projected_textures(vox_object: vox_parsing.Vox):
    """Returns projection-based textures for each side of the .vox model"""
    project = lambda arr, axis: np.take_along_axis(
        arr[:, :, :, 0:3],
        np.expand_dims((arr[:, :, :, 3] != 0).argmax(axis=axis), (axis, 3)),
        axis=axis,
    )

    # The color values in the table are stored as a palette, expand them into
    # their actual values.
    vox_map = vox_to_map(vox_object)

    # Convert from MagicaVoxel's coordinate system (where e.g. the z axis
    # represents "up") and what we use in biomes.
    indices = np.flip(vox_map.table.map.values.transpose([1, 0, 2]), axis=0)

    apply_palette = np.vectorize(
        lambda x: np.array(
            vox_map.table.index[x] if x != 0 else [0, 0, 0, 0], dtype=np.uint8
        ),
        otypes=[np.uint8],
        signature="()->(n)",
    )
    unpaletted = apply_palette(indices)

    z_neg = project(unpaletted, 0)
    z_pos = project(np.flip(unpaletted, axis=(0, 2)), 0)

    y_neg = project(np.flip(unpaletted, axis=1), 1)
    y_pos = project(unpaletted, 1)

    x_neg = project(unpaletted, 2)
    x_pos = project(np.flip(unpaletted, axis=(0, 2)), 2)

    return t.TextureAtlas(
        data=np.stack(
            [
                z_neg[0, :, :, :],
                z_pos[0, :, :, :],
                y_neg[:, 0, :, :],
                y_pos[:, 0, :, :],
                x_neg[:, :, 0, :],
                x_pos[:, :, 0, :],
            ],
            axis=0,
        )
    )


# Returns an array of indices into a palette.
def model_to_numpy(model: vox_parsing.Model) -> npt.NDArray:
    result = np.zeros(
        (model.size[0], model.size[1], model.size[2]), dtype=np.uint8
    )
    # Poke the result array for each item in voxels.
    for v in model.voxels:
        result[v[0], v[1], v[2]] = v[3]
    return result


def to_mesh(
    vox_map: VoxMap, transform: Optional[npt.NDArray] = None
) -> t.VoxMesh:
    # The input vox map cannot be empty, there must exist something to turn into
    # a surface, otherwise the output mesh will be empty.
    assert np.any(
        vox_map.table.map.values
    ), "A VoxMap is empty, we can't turn an empty VoxMap into a string."

    attributes_map: Dict[Tuple[meshes.Dir, int], npt.NDArray] = {}
    for d in meshes.Dir:
        for k, v in vox_map.table.index.items():
            attributes_map[(d, k)] = np.array(v)

    return t.VoxMesh(
        geometry=meshes.voxel_geometry(
            map=vox_map.table.map,
            attributes=attributes_map,
        ),
        transform=transform,
    )


def verify_skeletons_equal(
    posed_vox_joint_map: PosedVoxJointMap, reference_pose: poses.Pose
):
    if not poses.skeletons_equal(
        posed_vox_joint_map.skeleton, reference_pose.skeleton
    ):
        raise ValueError(
            "Skeletons do not match between PosedVoxJointMap and Pose."
        )


def to_mesh_joint_map(
    posed_vox_joint_map: PosedVoxJointMap,
    reference_pose: poses.Pose,
    alignment_transform: poses.Transform,
) -> gltf.MeshJointMap:
    verify_skeletons_equal(posed_vox_joint_map, reference_pose)

    flattened_bone_transforms = poses.flatten_pose(reference_pose)
    # This inverse_flattened_bone_transforms is also known as the "inverse bind map".
    inverse_flattened_bone_transforms = {
        k: np.linalg.inv(v) for k, v in flattened_bone_transforms.items()
    }

    return gltf.MeshJointMap(
        skeleton=posed_vox_joint_map.skeleton,
        mesh_joint_pairs=[
            (
                gltf.convert_vox_mesh_to_gltf_mesh(
                    to_mesh(
                        v,
                        np.matmul(
                            inverse_flattened_bone_transforms[j],
                            alignment_transform.to_numpy_affine(),
                        ),
                    ),
                )["mesh"],
                j,
            )
            for v, j in posed_vox_joint_map.vox_joint_pairs
        ],
    )


def add_skin_index_weight_attributes(vertices: npt.NDArray, joint_index: int):
    num_vertices = vertices.shape[0]

    # Since we only ever have a single joint with 100% weight, the weight is
    # redundant however systems that we rely on expect it to exist,
    # e.g. threejs, so we put it in. If we're willing to re-write more of
    # threejs, we could omit it.
    index_attributes = np.tile([joint_index, 0, 0, 0], (num_vertices, 1))
    weight_attributes = np.tile([1, 0, 0, 0], (num_vertices, 1))

    # Now graft in the skinning indices and weights.
    return np.column_stack((vertices, index_attributes, weight_attributes))


def to_skinned_mesh_joint_map(
    posed_vox_joint_map: PosedVoxJointMap,
    reference_pose: poses.Pose,
    alignment_transform: poses.Transform,
    joint_ordering: List[str],
) -> gltf.SkinnedMeshJointMap:
    verify_skeletons_equal(posed_vox_joint_map, reference_pose)

    # Go through each of the voxel maps and convert them to meshes, ensuring
    # that joint data is associated with each vertex as we go.
    meshes = []
    for v, j in posed_vox_joint_map.vox_joint_pairs:

        geometry = to_mesh(v).geometry
        joint_index = joint_ordering.index(j)

        mesh = t.VoxMesh(
            geometry=t.GeometryBuffer(
                vertices=t.ArrayData(
                    data=add_skin_index_weight_attributes(
                        geometry.vertices.data, joint_index
                    )
                ),
                indices=geometry.indices,
            ),
            transform=None,
        )
        meshes.append(mesh)

    # Merge the list of meshes into one mesh. The per-vertex joint data
    # is how we distinguish bones going forward.
    def merge_geometry(
        g1: t.GeometryBuffer, g2: t.GeometryBuffer
    ) -> t.GeometryBuffer:
        new_vertices = np.row_stack((g1.vertices.data, g2.vertices.data))
        new_indices = np.concatenate(
            (g1.indices.data, g2.indices.data + g1.vertices.data.shape[0])
        )
        return t.GeometryBuffer(
            vertices=t.ArrayData(data=new_vertices),
            indices=t.ArrayData(data=new_indices),
        )

    merged_geometry = reduce(merge_geometry, [x.geometry for x in meshes])
    merged_mesh = t.VoxMesh(geometry=merged_geometry, transform=None)

    # Put all the pieces together and convert this into a GLTF object.
    converted = gltf.convert_vox_mesh_to_gltf_mesh(
        merged_mesh,
        [
            gltf.VertexAttributeDescriptor(
                name="POSITION", start=0, stop=3, type=np.float32
            ),
            gltf.VertexAttributeDescriptor(
                name="COLOR_0", start=6, stop=10, type=np.uint8, multiplier=255
            ),
            gltf.VertexAttributeDescriptor(
                name="JOINTS_0", start=10, stop=14, type=np.uint8
            ),
            gltf.VertexAttributeDescriptor(
                name="WEIGHTS_0",
                start=14,
                stop=18,
                type=np.uint8,
                multiplier=255,
            ),
        ],
    )
    gltf_mesh = converted["mesh"]
    vertex_transform = converted["transform"]

    gltf_mesh.gltf.nodes[0].skin = 0

    # Calculate the inverse bind map.
    flattened_bone_transforms = poses.flatten_pose(reference_pose)
    inverse_flattened_bone_transforms = {
        k: np.matmul(
            np.matmul(
                np.linalg.inv(v),
                # Apply any global mesh transformations from outside before mapping to skeleton.
                alignment_transform.to_numpy_affine(),
            ),
            # Vertices may have been translated for compression, make sure that is re-applied.
            vertex_transform,
        )
        for k, v in flattened_bone_transforms.items()
    }
    inverse_bind_matrices = [
        inverse_flattened_bone_transforms[x] for x in joint_ordering
    ]
    # Since we've incorporated the transform into the inverse bind transforms,
    # we can now remove it from the node.
    gltf_mesh.gltf.nodes[0].matrix = None

    return gltf.SkinnedMeshJointMap(
        skeleton=posed_vox_joint_map.skeleton,
        mesh=gltf_mesh,
        joint_nodes=joint_ordering,
        inverse_bind_matrices=inverse_bind_matrices,
    )


def posed_vox_joint_map_to_gltf(posed_vox_joint_map: PosedVoxJointMap):
    return gltf.make_gltf_from_static_meshes(
        [
            gltf.convert_vox_mesh_to_gltf_mesh(to_mesh(v), j)["mesh"]
            for v, j in posed_vox_joint_map.vox_joint_pairs
        ]
    )


def vox_transform_to_numpy_matrix(
    vox_transform: vox_parsing.Transform,
) -> npt.NDArray:
    transform = np.zeros((4, 4))
    transform[3, 3] = 1
    transform[:-1, 3] = vox_transform.translation
    for i in range(3):
        transform[
            i, vox_transform.rotation.axis_reordering[i]
        ] = vox_transform.rotation.scale[i]
    return transform


def to_posed_vox_joint_map_from_layers(
    vox_object: vox_parsing.Vox, skeleton: poses.Skeleton
) -> PosedVoxJointMap:
    vox_maps_by_layer = get_visible_vox_maps_by_layer_name(vox_object)
    skeleton_node_names = set(
        [x[0] for x in poses.get_list_of_skeleton_nodes(skeleton)]
    )

    vox_joint_pairs: List[Tuple[VoxMap, str]] = []
    for layer_name, vox_maps in vox_maps_by_layer.items():
        if layer_name in skeleton_node_names:
            for vox_map in vox_maps:
                vox_joint_pairs.append((vox_map, layer_name))

    return PosedVoxJointMap(skeleton, vox_joint_pairs)


def get_visible_vox_maps_by_layer_name(
    vox_object: vox_parsing.Vox,
) -> Dict[str, List[VoxMap]]:
    scene_graph_models = vox_object.get_scene_graph_model_list()
    by_layer: Dict[str, List[VoxMap]] = defaultdict(list)

    for sgm in scene_graph_models:
        if sgm.hidden == vox_parsing.Hidden.YES:
            continue
        name = sgm.layer.name if sgm.layer and sgm.layer.name else "__no_layer"
        by_layer[name].append(
            vox_model_to_map(
                sgm.model, vox_object.palette, transform=sgm.transform
            )
        )

    return by_layer


def accumulate_posed_vox_joint_maps(
    posed_vox_joint_maps: List[PosedVoxJointMap],
) -> PosedVoxJointMap:
    assert len(posed_vox_joint_maps) > 0
    # First verify that our skeletons match across the different maps.
    skeleton = posed_vox_joint_maps[0].skeleton
    for pvjm in posed_vox_joint_maps:
        if not poses.skeletons_equal(pvjm.skeleton, skeleton):
            raise ValueError(
                "Skeletons are not consistent between PosedVoxJointMaps."
            )

    joints = [x[0] for x in poses.get_list_of_skeleton_nodes(skeleton)]

    ## Accumulate the vox maps, per joint.
    vox_joint_pairs: List[Tuple[VoxMap, str]] = []
    for joint in joints:
        vox_maps: List[VoxMap] = []
        for vox_joint_map in posed_vox_joint_maps:
            for vox_joint_pair in vox_joint_map.vox_joint_pairs:
                if vox_joint_pair[1] == joint:
                    vox_maps.append(vox_joint_pair[0])
        if vox_maps:
            vox_joint_pairs.append((accumulate_vox_maps(vox_maps), joint))

    return PosedVoxJointMap(skeleton, vox_joint_pairs)


def accumulate_vox_maps(vox_maps: List[VoxMap]) -> VoxMap:
    assert len(vox_maps) > 0

    output_table = vox_maps[0].table
    for vox_map in vox_maps[1:]:
        output_table = maps.merge_table(output_table, vox_map.table)

    return VoxMap(output_table)


def flatten_posed_vox_joint_map(posed_vox_joint_map: PosedVoxJointMap):
    return accumulate_vox_maps(
        [x[0] for x in posed_vox_joint_map.vox_joint_pairs]
    )


def vox_map_to_numpy_color_array(vox_map: VoxMap):
    apply_palette = np.vectorize(
        lambda x: np.array(
            [c * 255 for c in vox_map.table.index[x]]
            if x != 0
            else [0, 0, 0, 0],
            dtype=np.uint8,
        ),
        otypes=[np.uint8],
        signature="()->(n)",
    )
    return apply_palette(vox_map.table.map.values)


def convert_numpy_rgba_linear_image_to_srgb(image):
    # We've been doing all this work in the linear rgb color space up until
    # now. Convert to srgb before saving to a file.
    def convert_component_to_srgb(c):
        c = c / 255.0
        # From https://entropymine.com/imageworsener/srgbformula/
        return (
            np.where(
                c < 0.00313066844250063,
                12.92 * c,
                1.055 * (np.power(c, (1.0 / 2.4))) - 0.055,
            )
            * 255
        ).astype(np.uint8)

    return np.stack(
        [
            convert_component_to_srgb(image[..., 0]),
            convert_component_to_srgb(image[..., 1]),
            convert_component_to_srgb(image[..., 2]),
            image[..., 3],
        ],
        axis=-1,
    )


@dataclass
class FrameFittingInfo:
    viewport_dims: Tuple[float, float]
    center: Tuple[float, float, float]


# Projects the voxel non-alpha points into viewspace and finds their bounding
# boxes in order to determine how to best fit the 2D viewport around them for
# rendering.
def get_frame_fitting_info(
    dense_colors: np.ndarray,
    camera_direction: Tuple[float, float, float],
    up: Tuple[float, float, float],
) -> FrameFittingInfo:
    def normalized(vec: npt.NDArray):
        return vec / np.sqrt(np.dot(vec, vec))

    # Since we want to project in
    forward = normalized(np.array(camera_direction))
    right = normalized(np.cross(forward, np.array(up)))
    up = normalized(np.cross(right, forward))

    # Find all the voxels that have content in them.
    z, y, x = np.where(dense_colors[..., 3] > 0)
    points = np.stack([x, y, z], axis=-1).astype(np.float64)
    # Track all corners of the voxels, not just one corner.
    points = np.concatenate(
        [
            points + np.array([x, y, z])
            for x, y, z in product([0, 1], [0, 1], [0, 1])
        ],
        axis=0,
    )

    # Project the voxel points into view space.
    projected_points = np.stack(
        [
            np.dot(points, right),
            np.dot(points, up),
            np.dot(points, forward),
        ],
        axis=-1,
    )

    # Determine the bounding box of the projected points.
    projected_bounds = [
        np.min(projected_points, axis=0),
        np.max(projected_points, axis=0),
    ]
    projected_bounds_int = [
        np.floor(projected_bounds[0]).astype(np.int32),
        np.ceil(projected_bounds[1]).astype(np.int32),
    ]
    projected_dimensions = projected_bounds_int[1] - projected_bounds_int[0]

    # Determine the center of the projected points, and unproject it back to
    # voxel space so that we can use it to position the camera.
    projected_center = np.average(projected_bounds, axis=0)
    unprojected_center = (
        projected_center[0] * right
        + projected_center[1] * up
        + projected_center[2] * forward
    )

    return FrameFittingInfo(
        viewport_dims=projected_dimensions,
        center=unprojected_center,
    )


def iconify_voxel_array(
    dense_colors: np.ndarray,
    output_size: Tuple[int, int],
    camera_direction: Tuple[float, float, float],
    lighting_direction: Tuple[float, float, float],
    up: Tuple[float, float, float],
):
    """Generates an icone from an RGB voxel array.

    The dimensions of the numpy array are assumed to be [d, h, w, c]."""

    frame_fitting_info = get_frame_fitting_info(
        dense_colors, camera_direction, up
    )

    # Make sure the array is a minimum size, otherwise there will be a lot
    # of artifacts caused by the gaussian blurring.
    MIN_MAX_DIM = 64
    dim_multiplier = 1
    while np.max(dense_colors.shape) * dim_multiplier < MIN_MAX_DIM:
        dim_multiplier *= 2
    if dim_multiplier > 1:
        for i in range(3):
            dense_colors = np.repeat(dense_colors, dim_multiplier, axis=i)

    frame_fitting_info.center = [
        x * dim_multiplier for x in frame_fitting_info.center
    ]
    frame_fitting_info.viewport_dims = [
        x * dim_multiplier for x in frame_fitting_info.viewport_dims
    ]

    CAMERA_DISTANCE = 100  # Doesn't really matter since it's orthographic, just needs to be big enough.
    camera_position = (
        frame_fitting_info.center - np.array(camera_direction) * CAMERA_DISTANCE
    )
    zoom = (
        min(
            [
                output_size[i] / frame_fitting_info.viewport_dims[i]
                for i in range(2)
            ]
        )
        * 0.9
    )

    rgba_image = render_voxels.render_map(
        dense_colors,
        size=output_size,
        src=camera_position.tolist(),
        dir=camera_direction,
        lighting_dir=lighting_direction,
        up=up,
        zoom=zoom,
    )

    return convert_numpy_rgba_linear_image_to_srgb(rgba_image)


def render_vox_map(
    vox_map: VoxMap,
    output_size: Tuple[int, int],
    camera_direction: Tuple[float, float, float],
    lighting_direction: Tuple[float, float, float],
):
    if vox_map.table.map.values.size == 0:
        return np.zeros((output_size[0], output_size[1], 4), dtype=np.uint8)

    # Convert the merged table into a dense numpy array.
    dense_colors = vox_map_to_numpy_color_array(vox_map)

    # Rasterize the dense numpy array as a 2D image.
    return iconify_voxel_array(
        dense_colors,
        output_size,
        camera_direction,
        lighting_direction,
        [0, 0, 1],
    )


def get_aabb_center(vox_object: vox_parsing.Vox) -> Tuple[float, float, float]:
    # Get a VoxMap table by merging all the visible layers together.
    vox_maps = vox_scene_to_vox_maps(vox_object)

    # Make a dummy icon to return.
    if len(vox_maps) == 0:
        return [0, 0, 0]

    accumulated_vox_map = accumulate_vox_maps(vox_maps)

    aabb_center = np.average(accumulated_vox_map.table.map.aabb(), axis=0)
    return [aabb_center[0], aabb_center[1], aabb_center[2]]
