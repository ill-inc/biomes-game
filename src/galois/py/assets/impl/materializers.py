import base64
import json
import math
import random
from pathlib import Path
from typing import Any, List, Tuple, Union

import numpy as np
import pygltflib
from impl import (
    affine_transforms,
    audio,
    blocks,
    color_palettes,
    florae,
    glass,
    gltf,
    gltf_compression,
    groups,
    icons,
    item_meshes,
    mapping,
    poses,
    shapers,
    shapes,
    tensors,
    textures,
)
from impl import types as t
from impl import vox, vox_parsing, wearables
from impl.files import path_to_content
from impl.quaternions import Quaternion, axis_angle, quat_to_matrix, random_quat
from impl.repo import is_file, open_file

from voxeloo import galois as cpp


def materialize_AddNodeToGLTF_GLTF_Str_Str_AffineTransform(node: t.DerivedNode):
    gltf_object: t.GLTF = node.deps[0]
    node_name: str = node.deps[1]
    parent_node_name: str = node.deps[2]
    transform: affine_transforms.AffineTransform = node.deps[3]

    return t.GLTF(
        gltf.add_node_to_gltf(
            gltf_object.gltf, node_name, parent_node_name, transform
        )
    )


def materialize_AdjustBrightness_Texture_F32(node: t.DerivedNode):
    texture: t.Texture = node.deps[0]
    amount: float = node.deps[1]
    return textures.adjust_brightness(texture, amount)


def materialize_AdjustContrast_Texture_F32(node: t.DerivedNode):
    texture: t.Texture = node.deps[0]
    amount: float = node.deps[1]
    return textures.adjust_contrast(texture, amount)


def materialize_AdjustSaturation_Texture_F32(node: t.DerivedNode):
    texture: t.Texture = node.deps[0]
    amount: float = node.deps[1]
    return textures.adjust_saturation(texture, amount)


def materialize_AffineFromAxisRotation_Vec3F32_F32(node: t.DerivedNode):
    axis: Tuple[float, float, float] = node.deps[0]
    degrees: float = node.deps[1]

    return affine_transforms.from_axis_rotation(axis, degrees)


def materialize_AffineFromList_AffineTransformList(
    node: t.DerivedNode,
):
    transforms: List[affine_transforms.AffineTransform] = node.deps[0]
    return affine_transforms.from_list(transforms)


def materialize_AffineFromQuaternion_Quaternion(node: t.DerivedNode):
    quat: Quaternion = node.deps[0]
    return affine_transforms.from_quaternion(quat)


def materialize_AffineFromScale_Vec3F32(node: t.DerivedNode):
    scale: Tuple[float, float, float] = node.deps[0]
    return affine_transforms.from_scale(scale)


def materialize_AffineFromTranslation_Vec3F32(node: t.DerivedNode):
    translate: Tuple[float, float, float] = node.deps[0]
    return affine_transforms.from_translation(translate)


def materialize_Apply_BlockShapeTensor_Transform(node: t.DerivedNode):
    tensor: t.BlockShapeTensor = node.deps[0]
    transform: t.Transform = node.deps[1]
    return t.BlockShapeTensor(
        impl=cpp.transforms.apply(tensor.impl, transform.impl)
    )


def materialize_Apply_Mask_Transform(node: t.DerivedNode):
    mask: t.Mask = node.deps[0]
    transform: t.Transform = node.deps[1]
    return t.Mask(impl=cpp.transforms.apply(mask.impl, transform.impl))


def materialize_Apply_TerrainTensor_Transform(node: t.DerivedNode):
    tensor: t.TerrainTensor = node.deps[0]
    transform: t.Transform = node.deps[1]
    return t.Mask(impl=cpp.transforms.apply(tensor.impl, transform.impl))


def materialize_Apply_WaterTensor_Transform(node: t.DerivedNode):
    tensor: t.WaterTensor = node.deps[0]
    transform: t.Transform = node.deps[1]
    return t.Mask(impl=cpp.transforms.apply(tensor.impl, transform.impl))


def materialize_BlockShapeTensor_BlockShapeTensor(node: t.DerivedNode):
    t0: t.BlockShapeTensor = node.deps[0]
    t1: t.BlockShapeTensor = node.deps[1]
    return t.BlockShapeTensor(impl=cpp.csg.merge(t0.impl, t1.impl))


def materialize_Bool(node: t.LiteralNode):
    return node.data


def materialize_BoxMask_BoxList(node: t.DerivedNode):
    boxes: List[Tuple] = node.deps[0]
    values = np.zeros(shape=(32, 32, 32), dtype=bool)
    for box in boxes:
        x0, y0, z0 = box[0]
        x1, y1, z1 = box[1]
        values[z0:z1, y0:y1, x0:x1] = True
    return t.Mask(impl=tensors.zeros(tensors.Bool).fromarray(values))


def materialize_Clear_BlockShapeTensor_Mask(node: t.DerivedNode):
    tensor: t.BlockShapeTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    return t.BlockShapeTensor(impl=cpp.csg.clear(tensor.impl, mask.impl))


def materialize_Clear_TerrainTensor_Mask(node: t.DerivedNode):
    tensor: t.TerrainTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    return t.TerrainTensor(impl=cpp.csg.clear(tensor.impl, mask.impl))


def materialize_Clear_WaterTensor_Mask(node: t.DerivedNode):
    tensor: t.WaterTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    return t.WaterTensor(impl=cpp.csg.clear(tensor.impl, mask.impl))


def materialize_ColorPalettesDefinitions_ColorPaletteListList(
    node: t.DerivedNode,
):
    named_color_palette_list: List[
        Tuple[str, color_palettes.ColorPaletteList]
    ] = node.deps[0]
    return color_palettes.generate_color_palette_definitions_json(
        named_color_palette_list
    )


def materialize_PrimaryColorTable_ColorList(node: t.DerivedNode):
    color_list: List[Tuple[str, int]] = node.deps[0]
    return t.SourceFile(extension="json", content=json.dumps(dict(color_list)))


def materialize_Compose_Transform_Transform(node: t.DerivedNode):
    outer: t.Transform = node.deps[0]
    inner: t.Transform = node.deps[1]
    return t.Transform(impl=cpp.transforms.compose(outer.impl, inner.impl))


def materialize_Difference_Mask_Mask(node: t.DerivedNode):
    lhs: t.Mask = node.deps[0]
    rhs: t.Mask = node.deps[1]
    return t.Mask(impl=cpp.csg.clear(lhs.impl, rhs.impl))


def materialize_EmptyMask(node: t.DerivedNode):
    return t.Mask(impl=tensors.zeros(tensors.Bool))


def materialize_EmptyBlockShapeTensor(node: t.DerivedNode):
    return t.BlockShapeTensor(impl=tensors.zeros(tensors.U32))


def materialize_EmptyTerrainTensor(node: t.LiteralNode):
    return t.TerrainTensor(impl=tensors.zeros(tensors.U32))


def materialize_EmptyDyeTensor(node: t.DerivedNode):
    return t.DyeTensor(impl=tensors.zeros(tensors.U8))


def materialize_EmptyMuckTensor(node: t.DerivedNode):
    return t.MuckTensor(impl=tensors.zeros(tensors.U8))


def materialize_EmptyGrowthTensor(node: t.DerivedNode):
    return t.GrowthTensor(impl=tensors.zeros(tensors.U8))


def materialize_EmptyMoistureTensor(node: t.DerivedNode):
    return t.MoistureTensor(impl=tensors.zeros(tensors.U8))


def materialize_EmptyWaterTensor(node: t.LiteralNode):
    return t.WaterTensor(impl=tensors.zeros(tensors.U8))


def materialize_ExtractAllAnimations_GLTF_Skeleton(node: t.DerivedNode):
    gltf: pygltflib.GLTF2 = node.deps[0].gltf
    skeleton: poses.Skeleton = node.deps[1]
    return poses.load_animations_from_gltf(gltf, skeleton)


def materialize_ExtractAnimation_Str_Str_GLTF_Skeleton(node: t.DerivedNode):
    destination_name: str = node.deps[0]
    source_name: str = node.deps[1]
    gltf: pygltflib.GLTF2 = node.deps[2].gltf
    skeleton: poses.Skeleton = node.deps[3]
    return poses.load_animation_from_gltf(
        destination_name, source_name, gltf, skeleton
    )


def materialize_ExtractInitialPose_GLTF_Skeleton(node: t.DerivedNode):
    gltf: pygltflib.GLTF2 = node.deps[0].gltf
    skeleton: poses.Skeleton = node.deps[1]
    return poses.load_initial_pose_from_gltf(gltf, skeleton)


def materialize_F32(node: t.LiteralNode):
    return node.data


def materialize_F64(node: t.LiteralNode):
    return node.data


def materialize_FilterLayers_Vox_StrList(node: t.LiteralNode):
    vox_object: vox_parsing.Vox = node.deps[0]
    layers: List[str] = node.deps[1]
    return vox_parsing.filter_layers(vox_object, layers)


def materialize_FlattenAtlas_TextureAtlas(node: t.DerivedNode):
    atlas: t.TextureAtlas = node.deps[0]
    return textures.flatten_atlas(atlas)


def materialize_FlattenPosedVoxJointMap_PosedVoxJointMap(node: t.DerivedNode):
    posed_vox_joint_map: vox.PosedVoxJointMap = node.deps[0]
    return vox.flatten_posed_vox_joint_map(posed_vox_joint_map)


def materialize_FlipHorizontal_Texture(node: t.DerivedNode):
    data = node.deps[0].data
    return t.Texture(data=data[:, ::-1, :])


def materialize_FlipVertical_Texture(node: t.DerivedNode):
    data = node.deps[0].data
    return t.Texture(data=data[::-1, :, :])


def materialize_GetTransform_ItemMeshProperties(node: t.DerivedNode):
    item_mesh_properties: item_meshes.ItemMeshProperties = node.deps[0]
    return item_mesh_properties.transform


def materialize_GetAttachmentTransform_ItemMeshProperties(node: t.DerivedNode):
    item_mesh_properties: item_meshes.ItemMeshProperties = node.deps[0]
    return item_mesh_properties.attachment_transform


def materialize_GetIconSettings_ItemMeshProperties(node: t.DerivedNode):
    item_mesh_properties: item_meshes.ItemMeshProperties = node.deps[0]
    return item_mesh_properties.icon_settings


def materialize_HueShift_Texture_F32(node: t.DerivedNode):
    texture = node.deps[0]
    hue = node.deps[1]
    return textures.hue_shift(texture, np.uint8(hue * 255))


def materialize_I8(node: t.LiteralNode):
    return node.data


def materialize_I16(node: t.LiteralNode):
    return node.data


def materialize_I32(node: t.LiteralNode):
    return node.data


def materialize_I64(node: t.LiteralNode):
    return int(node.data)


def materialize_ImageRGB_PNGFile(node: t.DerivedNode):
    path: str = node.deps[0]
    return textures.load_image(path, mode="RGB")


def materialize_ImageRGBA_PNGFIle(node: t.DerivedNode):
    path: str = node.deps[0]
    return textures.load_image(path, mode="RGBA")


def materialize_Interesect_Mask_Mask(node: t.DerivedNode):
    lhs: t.Mask = node.deps[0]
    rhs: t.Mask = node.deps[1]
    return t.Mask(impl=cpp.csg.slice(lhs.impl, rhs.impl))


def materialize_List(node: t.DerivedNode):
    return [dep for dep in node.deps]


def materialize_Literal(node: t.LiteralNode):
    return node.data


def materialize_LoadGLTF_GLTFFile(node: t.DerivedNode):
    path: str = node.deps[0]
    content = gltf.load_gltf(path)
    content.convert_buffers(pygltflib.BufferFormat.DATAURI)
    return t.GLTF(content)


def materialize_LoadGroupTensor_Str(node: t.DerivedNode):
    blob: str = node.deps[0]
    impl = cpp.groups.Tensor()
    impl.loads(blob)
    return t.GroupTensor(impl=impl)


def materialize_LoadItemMeshPropertiesFromJSONOrUseDefault_Str_NamedAffineTransforms(
    node: t.DerivedNode,
):
    file_path = Path(node.deps[0])
    named_affine_transforms: affine_transforms.NamedAffineTransforms = (
        node.deps[1]
    )

    if is_file(file_path):
        with open_file(file_path) as f:
            return item_meshes.load_properties_or_use_default(
                f.read(), named_affine_transforms
            )
    else:
        return item_meshes.DEFAULT_PROPERTIES


def materialize_LoadWEBM_Str(node: t.DerivedNode):
    file_path = Path(node.deps[0])
    with open_file(file_path, binary=True) as f:
        return audio.load_webm(f.read())


def materialize_LoadNamedAffineTransformsFromJSON_Str(node: t.DerivedNode):
    file_path = Path(node.deps[0])
    with open_file(file_path) as f:
        return affine_transforms.load_named_transforms(f.read())


def materialize_LoadVox_VoxFile(
    node: t.DerivedNode,
):
    path: str = node.deps[0]
    return vox.load_from_bytes(path_to_content(path))


def materialize_Map(node: t.DerivedNode):
    return [dep for dep in node.deps]


def materialize_Merge_TerrainTensor_TerrainTensor(node: t.DerivedNode):
    t0: t.TerrainTensor = node.deps[0]
    t1: t.TerrainTensor = node.deps[1]
    return t.TerrainTensor(impl=cpp.csg.merge(t0.impl, t1.impl))


def materialize_Merge_WaterTensor_WaterTensor(node: t.DerivedNode):
    t0: t.WaterTensor = node.deps[0]
    t1: t.WaterTensor = node.deps[1]
    return t.WaterTensor(impl=cpp.csg.merge(t0.impl, t1.impl))


def materialize_Null(node: t.LiteralNode):
    return None


def materialize_PadToSize_Texture_TextureSize_Color(node: t.DerivedNode):
    texture: t.Texture = node.deps[0]
    size: Tuple[int, int] = node.deps[1]
    color: Tuple = node.deps[2]
    return textures.pad_to_size(texture, size, color)


def materialize_Permute_Axes(node: t.DerivedNode):
    x = node.deps[0].find("x")
    y = node.deps[0].find("y")
    z = node.deps[0].find("z")
    return t.Transform(impl=cpp.transforms.permute(x, y, z))


def materialize_PointMask_PointList(node: t.DerivedNode):
    points: List[Tuple] = node.deps[0]
    values = np.zeros(shape=(32, 32, 32)[::-1], dtype=bool)
    for x, y, z in points:
        values[z, y, x] = True
    return t.Mask(impl=tensors.zeros(tensors.Bool).fromarray(values))


def materialize_Reflect_Bool_Bool_Bool(node: t.DerivedNode):
    x: bool = node.deps[0]
    y: bool = node.deps[1]
    z: bool = node.deps[2]
    return t.Transform(impl=cpp.transforms.reflect(x, y, z))


def materialize_StripMeshNodeNamesFromGLTF_GLTF(node: t.DerivedNode):
    gltf_object: t.GLTF = node.deps[0]
    return t.GLTF(gltf.remove_mesh_node_names(gltf_object.gltf))


def materialize_RemovePaletteRangeVoxels_U8_U8_Vox(node: t.DerivedNode):
    start: int = node.deps[0]
    end: int = node.deps[1]
    vox_object: vox_parsing.Vox = node.deps[2]
    return vox.remove_palette_entries(start, end, vox_object)


def materialize_Str(node: t.LiteralNode):
    return node.data


def materialize_SubtractLayerVoxels_Vox_Str(node: t.LiteralNode):
    vox_object: vox_parsing.Vox = node.deps[0]
    layer_name: str = node.deps[1]
    return vox.subtract_layer_voxels(vox_object, layer_name)


def materialize_ToAtlas_BlockIndex(node: t.DerivedNode):
    index: t.BlockIndex = node.deps[0]
    return blocks.to_atlas(index)


def materialize_ToAtlas_FloraIndex(node: t.DerivedNode):
    index: t.FloraIndex = node.deps[0]
    return florae.to_atlas(index)


def materialize_Slice_BlockShapeTensor_Mask(node: t.DerivedNode):
    tensor: t.BlockShapeTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    return t.BlockShapeTensor(impl=cpp.csg.slice(tensor.impl, mask.impl))


def materialize_Slice_TerrainTensor_Mask(node: t.DerivedNode):
    tensor: t.TerrainTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    return t.TerrainTensor(impl=cpp.csg.slice(tensor.impl, mask.impl))


def materialize_Slice_WaterTensor_Mask(node: t.DerivedNode):
    tensor: t.WaterTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    return t.WaterTensor(impl=cpp.csg.slice(tensor.impl, mask.impl))


def materialize_ToAtlas_TextureList(node: t.DerivedNode):
    textures: List[t.Texture] = node.deps[0]
    return textures.build_atlas([texture.data for texture in textures])


def materialize_ToBinary_BinaryFile(node: t.DerivedNode):
    path: List[t.Texture] = node.deps[0]
    with open_file(path, binary=True) as f:
        return t.Binary(data=f.read())


def materialize_ToBlockID_U32(node: t.DerivedNode):
    id: int = node.deps[0]
    assert cpp.terrain.is_valid_block_id(id)
    return id


def materialize_ToBlockIndex_BlockAssignment_BlockID_NameMap(
    node: t.DerivedNode,
):
    entries: List[int, t.Block] = node.deps[0]
    error_id: int = node.deps[1]
    dye_map: List[Tuple[str, int]] = node.deps[2]
    return blocks.build_index(
        dict(entries),
        error_id,
        dict(dye_map),
    )


def materialize_ToBlockIsomorphism_U32_U32(node: t.DerivedNode):
    shape_id: int = node.deps[0]
    transform_id: int = node.deps[1]
    return cpp.shapes.to_isomorphism_id(shape_id, transform_id)


def materialize_ToBlockIsomorphismTable_BlockShapeIndex(node: t.DerivedNode):
    index: t.BlockShapeIndex = node.deps[0]
    return t.SourceFile(
        extension="json",
        content=json.dumps(dict(enumerate(index.impl.offsets))),
    )


def materialize_ToBlock_BlockFile(node: t.DerivedNode):
    path: str = node.deps[0]
    return blocks.load_block_file(path)


def materialize_ToBlock_BlockSample(node: t.DerivedNode):
    sample: t.BlockSample = node.deps[0]
    return t.Block(samples=(sample,))


def materialize_ToBlock_BlockSampleList(node: t.DerivedNode):
    samples: List[t.BlockSample] = node.deps[0]
    return t.Block(samples=tuple(samples))


def materialize_ToBlockSample_Block_Point(node: t.DerivedNode):
    block: t.Block = node.deps[0]
    point: Tuple[int, int, int] = node.deps[1]
    return blocks.sample(block, *point)


def materialize_ToCubeTexture_Texture_Texture_Texture(
    node: t.DerivedNode,
):
    st: t.Texture = node.deps[0]
    tt: t.Texture = node.deps[1]
    bt: t.Texture = node.deps[2]
    return t.CubeTexture(st, st, bt, tt, st, st)


def materialize_ToBlockSampleTexture_CubeTexture_CubeTexture(
    node: t.DerivedNode,
):
    color: t.CubeTexture = node.deps[0]
    mrea: t.CubeTexture = node.deps[1]
    return t.BlockSampleTexture(color, mrea)


def materialize_ToBlockSampleCriteria_Str_Str_Str_Str(node: t.DerivedNode):
    pos = node.deps[0]
    dye = node.deps[1]
    muck = node.deps[2]
    moisture = node.deps[3]
    return t.BlockSampleCriteria(
        pos,
        dye,
        muck,
        moisture,
    )


def materialize_ToBlockSample_BlockSampleCriteria_BlockSampleTexture(
    node: t.DerivedNode,
):
    criteria: t.BlockSampleCriteria = node.deps[0]
    texture: t.BlockSampleTexture = node.deps[1]
    return t.BlockSample(criteria, texture)


def materialize_ToBlockShapeIndex_BlockShapeAssignment(node: t.DerivedNode):
    entries: List[int, str, t.BlockShape] = node.deps[0]
    return shapes.to_index(entries)


def materialize_ToBlockShapeTensor_BlockTensor_BlockIsomorphism(
    node: t.DerivedNode,
):
    tensor: t.BlockTensor = node.deps[0]
    isomorphism_id: int = node.deps[1]
    return t.BlockShapeTensor(
        impl=cpp.shapes.to_tensor(tensor.impl, isomorphism_id)
    )


def materialize_ToBlockShapeTensor_GlassTensor_BlockIsomorphism(
    node: t.DerivedNode,
):
    tensor: t.GlassTensor = node.deps[0]
    isomorphism_id: int = node.deps[1]
    return t.BlockShapeTensor(
        impl=cpp.shapes.to_tensor(tensor.impl, isomorphism_id)
    )


def materialize_ToBlockShape_Mask(node: t.DerivedNode):
    mask: t.Mask = node.deps[0]
    return t.BlockShape(mask=mask.impl.array()[:8, :8, :8])


def materialize_ToBlockTensor_TerrainTensor(node: t.DerivedNode):
    tensor: t.TerrainTensor = node.deps[0]
    return t.BlockTensor(impl=cpp.terrain.to_blocks(tensor.impl))


def materialize_ToGlassTensor_TerrainTensor(node: t.DerivedNode):
    tensor: t.TerrainTensor = node.deps[0]
    return t.GlassTensor(impl=cpp.terrain.to_glass(tensor.impl))


def materialize_ToFloraID_U32(node: t.DerivedNode):
    id: int = node.deps[0]
    assert cpp.terrain.is_valid_flora_id(id)
    return id


def materialize_ToFloraIndex_FloraAssignment_FloraID(node: t.DerivedNode):
    entries: List[Tuple[int, t.Flora]] = node.deps[0]
    fallback: int = node.deps[1]
    return florae.to_index(dict(entries), fallback)


def materialize_ToFloraTensor_TerrainTensor(node: t.DerivedNode):
    tensor: t.TerrainTensor = node.deps[0]
    return t.FloraTensor(impl=cpp.terrain.to_florae(tensor.impl))


def materialize_ToFlora_FloraFile(node: t.DerivedNode):
    path: str = node.deps[0]
    return florae.load_flora_file(path)


def materialize_ToGLB_GLTF(node: t.DerivedNode):
    gltf_object: t.GLTF = node.deps[0]
    return t.GLB(gltf.serialize_to_glb(gltf_object.gltf))


def materialize_ToGLTFMesh_VoxelMesh(node: t.DerivedNode):
    mesh: t.VoxelMesh = node.deps[0]
    return gltf.convert_mesh_to_gltf_mesh(mesh)


def materialize_ToGLTFMesh_VoxMesh(node: t.DerivedNode):
    mesh: t.VoxMesh = node.deps[0]
    return gltf.convert_vox_mesh_to_gltf_mesh(mesh)


def materialize_ToGLTF_Vox(node: t.DerivedNode):
    vox_object: vox_parsing.Vox = node.deps[0]
    return t.GLTF(vox.vox_to_gltf(vox_object))


def materialize_ToGeometryBuffer_BlockShapeTensor_OcclusionTensor_BlockShapeIndex(
    node: t.DerivedNode,
):
    tensor: t.BlockShapeTensor = node.deps[0]
    occlusion: t.OcclusionTensor = node.deps[1]
    index: t.BlockShapeIndex = node.deps[2]
    return t.BlockGeometryBuffer(
        impl=cpp.shapes.to_geometry(tensor.impl, occlusion.impl, index.impl)
    )


def materialize_ToIcon_Block(node: t.DerivedNode):
    block: t.Block = node.deps[0]
    colors = blocks.block_as_rgba_array(block)
    return t.Texture(
        data=vox.iconify_voxel_array(
            dense_colors=np.transpose(colors, (1, 0, 2, 3)),
            output_size=(128, 128),
            camera_direction=(-1, -1, -1),
            lighting_direction=(-7, -5, -11),
            up=(0, 0, 1),
        )
    )


def materialize_ToIcon_Glass(node: t.DerivedNode):
    block: t.Glass = node.deps[0]
    colors = glass.glass_as_rgba_array(block)
    return t.Texture(
        data=vox.iconify_voxel_array(
            dense_colors=np.transpose(colors, (1, 0, 2, 3)),
            output_size=(128, 128),
            camera_direction=(-1, -1, -1),
            lighting_direction=(-7, -5, -11),
            up=(0, 0, 1),
        )
    )


def materialize_ToIcon_Flora(node: t.DerivedNode):
    flora: t.Flora = node.deps[0]
    colors = florae.flora_as_rgb_array(flora)
    return t.Texture(
        data=vox.iconify_voxel_array(
            dense_colors=np.transpose(colors, (1, 0, 2, 3)),
            output_size=(128, 128),
            camera_direction=(0, -2, -1),
            lighting_direction=(-7, -5, -11),
            up=(0, 0, 1),
        )
    )


def materialize_ToItemTable_ItemAssignment(node: t.DerivedNode):
    assignment: List[Tuple[str, Any]] = node.deps[0]
    return t.ItemTable(items=[dict(entry) for entry in assignment])


def materialize_CompressGLTF_GLTF(node: t.DerivedNode):
    gltf_object: t.GLTF = node.deps[0]
    return t.GLB(data=gltf_compression.compress_gltf(gltf_object.gltf))


def materialize_ReplacePaletteEntries_U8_U8_ColorPalette_Vox(
    node: t.DerivedNode,
):
    start: int = node.deps[0]
    end: int = node.deps[1]
    new_colors: int = node.deps[2]
    vox_object: int = node.deps[3]
    return vox.replace_palette_entries(start, end, new_colors, vox_object)


def materialize_WearablesDefinitions_WearableSlotSchema_WearableDefinitionList_Skeleton(
    node: t.DerivedNode,
):
    wearable_slot_schema: wearables.WearableSlotSchema = node.deps[0]
    wearable_definition_list: wearables.WearableDefinitionList = node.deps[1]
    character_skeleton: poses.Skeleton = node.deps[2]

    return wearables.generate_wearables_definitions_json(
        wearable_slot_schema,
        wearable_definition_list,
        character_skeleton,
    )


def materialize_LoadColorPaletteListFromJSONFile_StrList_Str(
    node: t.DerivedNode,
):
    expected_ids: List[str] = node.deps[0]
    file_path: str = node.deps[1]
    with open_file(file_path) as f:
        return color_palettes.load_expected_color_entries_from_json(
            expected_ids, f.read()
        )


def materialize_GetColorEntry_Str_ColorPaletteList(node: t.DerivedNode):
    id: str = node.deps[0]
    named_color_palette_list: color_palettes.ColorPaletteList = node.deps[1]
    return color_palettes.get_color_entry(id, named_color_palette_list)


def materialize_ToBlockShapeTable_BlockShapeAssignment(node: t.DerivedNode):
    entries: List[Tuple[int, str, t.BlockShape]] = node.deps[0]
    return t.SourceFile(
        extension="json",
        content=json.dumps({name: id for id, name, _ in entries}, indent=2),
    )


def materialize_ToGeometryBuffer_FloraTensor_GrowthTensor_FloraIndex(
    node: t.DerivedNode,
):
    tensor: t.FloraTensor = node.deps[0]
    growth: t.GrowthTensor = node.deps[1]
    index: t.FloraIndex = node.deps[2]
    return florae.to_geometry_buffer(tensor, growth, index)


def materialize_ToGroupIndex_BlockIndex_BlockShapeIndex_FloraIndex_BlockIndex(
    node: t.DerivedNode,
):
    blocks: t.BlockIndex = node.deps[0]
    shapes: t.BlockShapeIndex = node.deps[1]
    florae: t.FloraIndex = node.deps[2]
    glasses: t.BlockIndex = node.deps[3]
    return groups.to_index(blocks, shapes, florae, glasses)


def materialize_ToGroupTensor_TerrainTensor_BlockShapeTensor_DyeTensor_MoistureTensor_GrowthTensor(
    node: t.DerivedNode,
):
    tensor: t.TerrainTensor = node.deps[0]
    isomorphisms: t.BlockShapeTensor = node.deps[1]
    dyes: t.DyeTensor = node.deps[2]
    moistures: t.MoistureTensor = node.deps[3]
    growths: t.GrowthTensor = node.deps[4]
    return t.GroupTensor(
        impl=cpp.groups.to_tensor(
            tensor.impl,
            isomorphisms.impl,
            dyes.impl,
            moistures.impl,
            growths.impl,
        ),
    )


def materialize_ToGLTF_MeshJointMap_Pose_AnimationList(node: t.DerivedNode):
    mesh_joint_map: gltf.MeshJointMap = node.deps[0]
    initial_pose: poses.Pose = node.deps[1]
    animation_list: List[poses.Animation] = node.deps[2]
    return t.GLTF(
        gltf.create_animated_gltf_from_mesh_joint_map(
            mesh_joint_map, initial_pose, animation_list
        )
    )


def materialize_ToGLTF_GLTFMesh(node: t.DerivedNode):
    gltf_mesh: gltf.GLTFMesh = node.deps[0]
    return t.GLTF(gltf.convert_gltf_mesh_to_gltf(gltf_mesh))


def materialize_ToGLTF_MeshJointMap_Pose(node: t.DerivedNode):
    mesh_joint_map: gltf.MeshJointMap = node.deps[0]
    pose: poses.Pose = node.deps[1]
    return t.GLTF(
        gltf.create_static_gltf_from_mesh_joint_map(mesh_joint_map, pose)[0]
    )


def materialize_ToImageRGB_PNG(node: t.DerivedNode):
    png: t.PNG = node.deps[0]
    return textures.load_image_from_bytes(png.data, mode="RGB")


def materialize_ToImageRGBA_PNG(node: t.DerivedNode):
    png: t.PNG = node.deps[0]
    return textures.load_image_from_bytes(png.data, mode="RGBA")


def materialize_ToItemMesh_BlockID_BlockIndex(node: t.DerivedNode):
    block: int = node.deps[0]
    index: t.BlockIndex = node.deps[1]
    return blocks.to_item_mesh(block, index)


def materialize_ToItemMesh_FloraID_FloraIndex(node: t.DerivedNode):
    flora: int = node.deps[0]
    index: t.FloraIndex = node.deps[1]
    return florae.to_item_mesh(flora, index)


def materialize_ToItemMesh_GlassID_BlockIndex(node: t.DerivedNode):
    block: int = node.deps[0]
    index: t.BlockIndex = node.deps[1]
    return glass.to_item_mesh(block, index)


def materialize_ToItemMesh_GLB_AffineTransform(node: t.DerivedNode):
    glb_object: t.GLB = node.deps[0]
    hand_attachment_transform: affine_transforms.AffineTransform = node.deps[1]

    return item_meshes.to_item_mesh(glb_object, hand_attachment_transform)


def materialize_ToItemMesh_GLTF(node: t.DerivedNode):
    gltf_object: t.GLTF = node.deps[0]
    return item_meshes.to_item_mesh(gltf_object)


def materialize_ToLightingBuffer_BlockTensor_BlockShapeTensor(
    node: t.DerivedNode,
):
    surface: t.FloraTensor = node.deps[0]
    isomorphisms: t.BlockShapeTensor = node.deps[1]
    return t.LightingBuffer(
        cpp.lighting.to_buffer(surface.impl, isomorphisms.impl)
    )


def materialize_ToLightingBuffer_GlassTensor_BlockShapeTensor(
    node: t.DerivedNode,
):
    surface: t.GlassTensor = node.deps[0]
    isomorphisms: t.BlockShapeTensor = node.deps[1]
    return t.LightingBuffer(
        cpp.lighting.to_buffer(surface.impl, isomorphisms.impl)
    )


def materialize_ToLightingBuffer_FloraTensor_BlockShapeTensor(
    node: t.DerivedNode,
):
    surface: t.BlockTensor = node.deps[0]
    isomorphisms: t.BlockShapeTensor = node.deps[1]
    return t.LightingBuffer(
        cpp.lighting.to_buffer(surface.impl, isomorphisms.impl)
    )


def materialize_ToLightingBuffer_WaterTensor_BlockShapeTensor(
    node: t.DerivedNode,
):
    surface: t.WaterTensor = node.deps[0]
    isomorphisms: t.BlockShapeTensor = node.deps[1]
    return t.LightingBuffer(
        cpp.lighting.to_buffer(surface.impl, isomorphisms.impl)
    )


def materialize_ToMapTexture_Block_Str_Str(node: t.DerivedNode):
    block: t.Block = node.deps[0]
    muck: str = node.deps[1]
    color: str = node.deps[2]
    return mapping.map_textures_from_block(block, muck, color)


def materialize_ToMaterialBuffer_BlockSampleTensor(
    node: t.DerivedNode,
):
    block_samples: t.BlockSampleTensor = node.deps[0]
    return t.BlockMaterialBuffer(
        cpp.blocks.to_material_buffer(block_samples.impl)
    )


def materialize_ToMeshJointMap_GLTFMesh_Skeleton(node: t.DerivedNode):
    mesh: gltf.MeshJointMapData = node.deps[0]
    skeleton: poses.Skeleton = node.deps[1]
    return gltf.MeshJointMap(
        skeleton,
        [(mesh, x[0]) for x in poses.get_list_of_skeleton_nodes(skeleton)],
    )


def materialize_ToMeshJointMap_MeshJointMapData_Skeleton(node: t.DerivedNode):
    mesh_joint_map_data: gltf.MeshJointMapData = node.deps[0]
    skeleton: poses.Skeleton = node.deps[1]
    return gltf.MeshJointMap(skeleton, mesh_joint_map_data)


def materialize_ToMeshJointMap_PosedVoxJointMap_Pose_GLTFTransform(
    node: t.DerivedNode,
):
    posed_vox_joint_map: vox.PosedVoxJointMap = node.deps[0]
    reference_pose: poses.Pose = node.deps[1]
    align_transform = poses.Transform(*node.deps[2])
    return vox.to_mesh_joint_map(
        posed_vox_joint_map, reference_pose, align_transform
    )


def materialize_ToMesh_BlockGeometryBuffer_BlockMaterialBuffer_LightingBuffer_BlockAtlas(
    node: t.DerivedNode,
):
    geometry: t.BlockGeometryBuffer = node.deps[0]
    material: t.BlockMaterialBuffer = node.deps[1]
    lighting: t.LightingBuffer = node.deps[2]
    atlas: t.BlockAtlas = node.deps[3]
    return t.BlockMesh(geometry, material, lighting, atlas)


def materialize_ToGlassMesh_BlockGeometryBuffer_BlockMaterialBuffer_LightingBuffer_BlockAtlas(
    node: t.DerivedNode,
):
    geometry: t.BlockGeometryBuffer = node.deps[0]
    material: t.BlockMaterialBuffer = node.deps[1]
    lighting: t.LightingBuffer = node.deps[2]
    atlas: t.BlockAtlas = node.deps[3]
    return t.GlassMesh(geometry, material, lighting, atlas)


def materialize_ToMesh_BlockMesh_FloraMesh_GlassMesh(node: t.DerivedNode):
    block: t.BlockMesh = node.deps[0]
    flora: t.FloraMesh = node.deps[1]
    glass: t.GlassMesh = node.deps[2]
    return t.TerrainMesh(block, flora, glass)


def materialize_ToMesh_FloraGeometryBuffer_LightingBuffer_FloraAtlas(
    node: t.DerivedNode,
):
    geometry: t.FloraGeometryBuffer = node.deps[0]
    lighting: t.LightingBuffer = node.deps[1]
    atlas: t.FloraAtlas = node.deps[2]
    return t.FloraMesh(geometry, lighting, atlas)


def materialize_ToMesh_GroupTensor_GroupIndex(node: t.DerivedNode):
    tensor: t.GroupTensor = node.deps[0]
    index: t.GroupIndex = node.deps[1]
    return groups.to_mesh(tensor, index)


def materialize_ToMesh_WaterTensor_LightingBuffer(node: t.DerivedNode):
    tensor: t.WaterTensor = node.deps[0]
    lighting: t.LightingBuffer = node.deps[1]
    return t.WaterMesh(
        geometry=t.WaterGeometryBuffer(impl=cpp.water.to_geometry(tensor.impl)),
        lighting=lighting,
    )


def materialize_ToOcclusionTensor_BlockShapeTensor_BlockShapeIndex(
    node: t.DerivedNode,
):
    tensor: t.BlockShapeTensor = node.deps[0]
    index: t.BlockShapeIndex = node.deps[1]
    return t.OcclusionTensor(
        impl=cpp.shapes.to_occlusion_tensor(tensor.impl, index.impl)
    )


def materialize_ToGlassOcclusionTensor_BlockShapeTensor_GlassTensor_DyeTensor_BlockShapeIndex(
    node: t.DerivedNode,
):
    tensor: t.BlockShapeTensor = node.deps[0]
    glass_tensor: t.GlassTensor = node.deps[1]
    dyes: t.DyeTensor = node.deps[2]
    index: t.BlockShapeIndex = node.deps[3]
    return t.OcclusionTensor(
        impl=cpp.shapes.to_glass_occlusion_tensor(
            tensor.impl, glass_tensor.impl, dyes.impl, index.impl
        )
    )


def materialize_ToSurfaceTensor_BlockTensor_OcclusionTensor(
    node: t.DerivedNode,
):
    blocks: t.BlockTensor = node.deps[0]
    occlusion: t.OcclusionTensor = node.deps[1]
    return t.BlockTensor(
        impl=cpp.blocks.to_surface_tensor(blocks.impl, occlusion.impl)
    )


def materialize_ToSurfaceTensor_WaterTensor(
    node: t.DerivedNode,
):
    tensor: t.WaterTensor = node.deps[0]
    return t.WaterTensor(impl=cpp.water.to_surface(tensor.impl))


def materialize_ToPNG_Str(node: t.DerivedNode):
    data: str = node.deps[0]
    return t.PNG(base64.b64decode(data))


def materialize_ToPNG_Texture(node: t.DerivedNode):
    data: t.Texture = node.deps[0]
    return t.PNG(textures.to_image_data(data, format="PNG"))


def materialize_ToPosedVoxJointMapFromVoxLayers_Vox_Skeleton(
    node: t.DerivedNode,
):
    vox_object: vox_parsing.Vox = node.deps[0]
    skeleton: poses.Skeleton = node.deps[1]
    return vox.to_posed_vox_joint_map_from_layers(vox_object, skeleton)


def materialize_ToPosedVoxJointMapFromWearables_WearableSlotSchema_WearableList(
    node: t.DerivedNode,
):
    schema: wearables.WearableSlotSchema = node.deps[0]
    wearable_list: List[wearables.Wearable] = node.deps[1]
    return wearables.to_posed_vox_joint_map_from_wearables(
        schema, wearable_list
    )


def materialize_ToSkinnedMeshJointMap_PosedVoxJointMap_Pose_GLTFTransform_StrList(
    node: t.DerivedNode,
):
    posed_vox_joint_map: vox.PosedVoxJointMap = node.deps[0]
    reference_pose: poses.Pose = node.deps[1]
    align_transform = poses.Transform(*node.deps[2])
    joint_ordering: List[str] = node.deps[3]

    return vox.to_skinned_mesh_joint_map(
        posed_vox_joint_map, reference_pose, align_transform, joint_ordering
    )


def materialize_ToShaper_BlockShapeIndex_U32_ShapeList(node: t.DerivedNode):
    index: t.BlockShapeIndex = node.deps[0]
    shape: int = node.deps[1]
    overrides: List[int] = node.deps[2]
    transform = t.Transform(impl=cpp.transforms.shift(0, 0, 0))
    return shapers.to_shaper(index, shape, overrides, transform)


def materialize_ToShaper_BlockShapeIndex_U32_ShapeList_Transform(
    node: t.DerivedNode,
):
    index: t.BlockShapeIndex = node.deps[0]
    shape: int = node.deps[1]
    overrides: List[int] = node.deps[2]
    transform: t.Transform = node.deps[3]
    return shapers.to_shaper(index, shape, overrides, transform)


def materialize_ToShaperTable_ShaperIndex(node: t.DerivedNode):
    index: List[Tuple[str, t.Shaper]] = node.deps[0]
    return t.SourceFile(
        extension="json",
        content=json.dumps(
            {
                name: {"index": shaper.index, "overrides": shaper.overrides}
                for name, shaper in index
            },
            indent=2,
        ),
    )


def materialize_ToTexture_BlockSample_Dir(node: t.DerivedNode):
    sample: t.BlockSample = node.deps[0]
    dir: t.Dir = t.Dir.from_str(node.deps[1])
    return sample.texture.texture(dir)


def materialize_ToMreaTexture_BlockSample_Dir(node: t.DerivedNode):
    sample: t.BlockSample = node.deps[0]
    dir: t.Dir = t.Dir.from_str(node.deps[1])
    return sample.texture.mreaTexture(dir)


def materialize_ToVoxMap_Vox(node: t.DerivedNode):
    vox_object: vox_parsing.Vox = node.deps[0]
    return vox.vox_to_map(vox_object)


def materialize_ToVoxMesh_VoxMap(node: t.DerivedNode):
    vox_map: vox.VoxMap = node.deps[0]
    return vox.to_mesh(vox_map)


def materialize_ToWireframeMesh_GroupTensor_BlockShapeIndex(
    node: t.DerivedNode,
):
    tensor: t.GroupTensor = node.deps[0]
    index: t.BlockShapeIndex = node.deps[1]
    return t.WireframeMesh(
        impl=cpp.groups.to_wireframe_mesh(tensor.impl, index.impl)
    )


def materialize_LoadIconSettingsFromJSON_Str(node: t.DerivedNode):
    data: str = node.deps[0]
    return icons.parse_icon_settings_from_json_dict(json.loads(data))


def materialize_RenderVoxMap_VoxMap_PairU16_IconSettings(
    node: t.DerivedNode,
):
    vox_map: vox.VoxMap = node.deps[0]
    output_size: Tuple[int, int] = node.deps[1]
    icon_settings: icons.IconSettings = node.deps[2]

    return icons.render_vox_map_with_settings(
        vox_map, output_size, icon_settings
    )


def materialize_RenderVoxMap_VoxMap_PairU16_Vec3F32_Vec3F32(
    node: t.DerivedNode,
):
    vox_map: vox.VoxMap = node.deps[0]
    output_size: Tuple[int, int] = node.deps[1]
    camera_direction: Tuple[float, float, float] = node.deps[2]
    lighting_direction: Tuple[float, float, float] = node.deps[3]

    return t.Texture(
        data=vox.render_vox_map(
            vox_map,
            output_size,
            camera_direction,
            lighting_direction,
        )
    )


def materialize_ToGLTF_PosedVoxJointMap(node: t.DerivedNode):
    posed_vox_joint_map: vox.PosedVoxJointMap = node.deps[0]
    return t.GLTF(vox.posed_vox_joint_map_to_gltf(posed_vox_joint_map))


def materialize_ToGLTF_SkinnedMeshJointMap_Pose_AnimationList(
    node: t.DerivedNode,
):
    skinned_mesh_joint_map: gltf.SkinnedMeshJointMap = node.deps[0]
    initial_pose: poses.Pose = node.deps[1]
    animation_list: List[poses.Animation] = node.deps[2]
    return t.GLTF(
        gltf.create_animated_gltf_from_skinned_mesh_joint_map(
            skinned_mesh_joint_map, initial_pose, animation_list
        )
    )


def materialize_ToTerrainID_BlockID(node: t.DerivedNode):
    id: int = node.deps[0]
    return cpp.terrain.from_block_id(id)


def materialize_ToTerrainID_FloraID(node: t.DerivedNode):
    id: int = node.deps[0]
    return cpp.terrain.from_flora_id(id)


def materialize_ToTerrainID_GlassID(node: t.DerivedNode):
    id: int = node.deps[0]
    return cpp.terrain.from_glass_id(id)


def materialize_ToTerrainQuirksTable_TerrainQuirks(node: t.DerivedNode):
    entries: List[Tuple[int, Any]] = node.deps[0]
    return t.SourceFile(
        extension="json",
        content=json.dumps(entries, indent=2),
    )


def materialize_ToTerrainTable_TerrainAssignment(node: t.DerivedNode):
    entries: List[Tuple[str, int]] = node.deps[0]
    return t.SourceFile(
        extension="json",
        content=json.dumps(dict(entries), indent=2),
    )


def materialize_TransformGLTF_GLTF_AffineTransform(
    node: t.DerivedNode,
):
    gltf_object: t.GLTF = node.deps[0]
    transform: affine_transforms.AffineTransform = node.deps[1]
    return t.GLTF(gltf.transform_gltf_affine(gltf_object.gltf, transform))


def materialize_TransformGLTF_GLTF_GLTFTransform(
    node: t.DerivedNode,
):
    gltf_object: t.GLTF = node.deps[0]
    transform = poses.Transform(*node.deps[1])
    return t.GLTF(gltf.transform_gltf(gltf_object.gltf, transform))


def materialize_TransformGLTFMesh_GLTFMesh_GLTFTransform(
    node: t.DerivedNode,
):
    gltf_mesh: gltf.GLTFMesh = node.deps[0]
    transform = poses.Transform(*node.deps[1])
    return t.GLTF(gltf.transform_gltf_mesh(gltf_mesh, transform))


def materialize_Transform_Pose_GLTFTransform(
    node: t.DerivedNode,
):
    pose: poses.Pose = node.deps[0]
    transform = poses.Transform(*node.deps[1])
    return poses.transform_pose(pose, transform)


def materialize_Translate_I32_I32_I32(node: t.DerivedNode):
    x: int = node.deps[0]
    y: int = node.deps[1]
    z: int = node.deps[2]
    return t.Transform(impl=cpp.transforms.shift(x, y, z))


def materialize_GetAABBCenter_Vox(node: t.DerivedNode):
    vox_object: vox_parsing.Vox = node.deps[0]

    center = vox.get_aabb_center(vox_object)
    return [-center[0], -center[1], -center[2]]


def materialize_Tuple(node: t.LiteralNode):
    return tuple(dep for dep in node.deps)


def materialize_U8(node: t.LiteralNode):
    return node.data


def materialize_U16(node: t.LiteralNode):
    return node.data


def materialize_U32(node: t.LiteralNode):
    return node.data


def materialize_U64(node: t.LiteralNode):
    return int(node.data)


def materialize_Union_Mask_Mask(node: t.DerivedNode):
    lhs: t.Mask = node.deps[0]
    rhs: t.Mask = node.deps[1]
    return t.Mask(impl=cpp.csg.merge(lhs.impl, rhs.impl))


def materialize_Write_BlockShapeTensor_Mask_BlockIsomorphism(
    node: t.DerivedNode,
):
    tensor: t.BlockShapeTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    id: int = node.deps[2]
    return t.BlockShapeTensor(impl=cpp.csg.write(tensor.impl, mask.impl, id))


def materialize_Write_TerrainTensor_Mask_TerrainID(node: t.DerivedNode):
    tensor: t.TerrainTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    id: int = node.deps[2]
    return t.TerrainTensor(impl=cpp.csg.write(tensor.impl, mask.impl, id))


def materialize_Write_WaterTensor_Mask_WaterValue(node: t.DerivedNode):
    tensor: t.WaterTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    value: int = node.deps[2]
    return t.WaterTensor(impl=cpp.csg.write(tensor.impl, mask.impl, value))


def materialize_PrimaryColorTable_ColorList(node: t.DerivedNode):
    color_list: List[Tuple[str, int]] = node.deps[0]
    return t.SourceFile(extension="json", content=json.dumps(dict(color_list)))


def materialize_ToBlueprintGroupDefinition_U32_Str_GroupTensor(
    node: t.DerivedNode,
):
    id: int = node.deps[0]
    name: str = node.deps[1]
    tensor: t.GroupTensor = node.deps[2]
    return t.BlueprintGroupDefinition(id, name, tensor)


def materialize_ToBlueprintGroupDefinitions_BlueprintGroupDefinitions(
    node: t.DerivedNode,
):
    blueprints: List[t.BlueprintGroupDefinition] = node.deps[0]
    definition_dict = {
        str(blueprint.id): {
            "name": blueprint.name,
            "tensor": blueprint.tensor.impl.dumps(),
        }
        for blueprint in blueprints
    }
    return t.SourceFile(
        extension="json",
        content=json.dumps(definition_dict, indent=2),
    )


def materialize_ToPlaceable_U32_Point_Orientation(node: t.DerivedNode):
    id: int = node.deps[0]
    position: Tuple[int, int, int] = node.deps[1]
    orientation: Tuple[int, int] = node.deps[2]
    return t.Placeable(id, position, orientation)


def materialize_Apply_DyeTensor_Transform(node: t.DerivedNode):
    tensor: t.DyeTensor = node.deps[0]
    transform: t.Transform = node.deps[1]
    return t.Mask(impl=cpp.transforms.apply(tensor.impl, transform.impl))


def materialize_Clear_DyeTensor_Mask(node: t.DerivedNode):
    tensor: t.DyeTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    return t.DyeTensor(impl=cpp.csg.clear(tensor.impl, mask.impl))


def materialize_Merge_DyeTensor_DyeTensor(node: t.DerivedNode):
    t0: t.DyeTensor = node.deps[0]
    t1: t.DyeTensor = node.deps[1]
    return t.DyeTensor(impl=cpp.csg.merge(t0.impl, t1.impl))


def materialize_Slice_DyeTensor_Mask(node: t.DerivedNode):
    tensor: t.DyeTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    return t.DyeTensor(impl=cpp.csg.slice(tensor.impl, mask.impl))


def materialize_Write_DyeTensor_Mask_U8(node: t.DerivedNode):
    tensor: t.DyeTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    value: int = node.deps[2]
    return t.DyeTensor(impl=cpp.csg.write(tensor.impl, mask.impl, value))


def materialize_Apply_GrowthTensor_Transform(node: t.DerivedNode):
    tensor: t.GrowthTensor = node.deps[0]
    transform: t.Transform = node.deps[1]
    return t.Mask(impl=cpp.transforms.apply(tensor.impl, transform.impl))


def materialize_Clear_GrowthTensor_Mask(node: t.DerivedNode):
    tensor: t.GrowthTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    return t.GrowthTensor(impl=cpp.csg.clear(tensor.impl, mask.impl))


def materialize_Merge_GrowthTensor_GrowthTensor(node: t.DerivedNode):
    t0: t.GrowthTensor = node.deps[0]
    t1: t.GrowthTensor = node.deps[1]
    return t.GrowthTensor(impl=cpp.csg.merge(t0.impl, t1.impl))


def materialize_Slice_GrowthTensor_Mask(node: t.DerivedNode):
    tensor: t.GrowthTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    return t.GrowthTensor(impl=cpp.csg.slice(tensor.impl, mask.impl))


def materialize_Write_GrowthTensor_Mask_U8(node: t.DerivedNode):
    tensor: t.GrowthTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    value: int = node.deps[2]
    return t.GrowthTensor(impl=cpp.csg.write(tensor.impl, mask.impl, value))


def materialize_Apply_MoistureTensor_Transform(node: t.DerivedNode):
    tensor: t.MoistureTensor = node.deps[0]
    transform: t.Transform = node.deps[1]
    return t.Mask(impl=cpp.transforms.apply(tensor.impl, transform.impl))


def materialize_Clear_MoistureTensor_Mask(node: t.DerivedNode):
    tensor: t.MoistureTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    return t.MoistureTensor(impl=cpp.csg.clear(tensor.impl, mask.impl))


def materialize_Merge_MoistureTensor_MoistureTensor(node: t.DerivedNode):
    t0: t.MoistureTensor = node.deps[0]
    t1: t.MoistureTensor = node.deps[1]
    return t.MoistureTensor(impl=cpp.csg.merge(t0.impl, t1.impl))


def materialize_Slice_MoistureTensor_Mask(node: t.DerivedNode):
    tensor: t.MoistureTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    return t.MoistureTensor(impl=cpp.csg.slice(tensor.impl, mask.impl))


def materialize_Write_MoistureTensor_Mask_U8(node: t.DerivedNode):
    tensor: t.MoistureTensor = node.deps[0]
    mask: t.Mask = node.deps[1]
    value: int = node.deps[2]
    return t.MoistureTensor(impl=cpp.csg.write(tensor.impl, mask.impl, value))


def materialize_ToBlockSampleTensor_BlockTensor_DyeTensor_MuckTensor_MoistureTensor_BlockIndex(
    node: t.DerivedNode,
):
    tensor: t.BlockTensor = node.deps[0]
    dyes: t.DyeTensor = node.deps[1]
    muck: t.MuckTensor = node.deps[2]
    moistures: t.MoistureTensor = node.deps[3]
    index: t.BlockIndex = node.deps[4]
    return t.BlockSampleTensor(
        impl=cpp.blocks.to_block_sample_tensor(
            tensor.impl, dyes.impl, muck.impl, moistures.impl, index.impl
        )
    )


def materialize_ToBlockSampleTensor_GlassTensor_DyeTensor_MuckTensor_MoistureTensor_BlockIndex(
    node: t.DerivedNode,
):
    tensor: t.GlassTensor = node.deps[0]
    dyes: t.DyeTensor = node.deps[1]
    muck: t.MuckTensor = node.deps[2]
    moistures: t.MoistureTensor = node.deps[3]
    index: t.BlockIndex = node.deps[4]
    return t.BlockSampleTensor(
        impl=cpp.blocks.to_block_sample_tensor(
            tensor.impl, dyes.impl, muck.impl, moistures.impl, index.impl
        )
    )


def materialize_ToFloraSampleCriteria_Str_Str(node: t.DerivedNode):
    growth: str = node.deps[0]
    muck: str = node.deps[1]
    return t.FloraSampleCriteria(growth, muck)


def materialize_ToFloraSampleGeometry_FloraVertices_FloraIndices(
    node: t.DerivedNode,
):
    vertices: List[List[float]] = node.deps[0]
    indices: List[int] = node.deps[1]
    flora_vertices = tuple(
        [
            t.FloraVertex(tuple(v[:3]), tuple(v[3:6]), tuple(v[6:8]), v[8])
            for v in vertices
        ]
    )
    return t.FloraSampleGeometry(flora_vertices, tuple(indices))


def materialize_ToFloraSampleMaterial_TextureList(node: t.DerivedNode):
    textures: List[t.Texture] = node.deps[0]
    return t.FloraSampleMaterial(tuple(textures))


def materialize_ToFloraSample_FloraSampleCriteria_FloraSampleGeometry_FloraSampleMaterial_FloraSampleTransform(
    node: t.DerivedNode,
):
    criteria: t.FloraSampleCriteria = node.deps[0]
    geometry: t.FloraSampleGeometry = node.deps[1]
    material: t.FloraSampleMaterial = node.deps[2]
    transform: affine_transforms.AffineTransform = node.deps[3]
    return t.FloraSample(criteria, geometry, material, transform)


def materialize_ToGlassID_U32(node: t.DerivedNode):
    id: int = node.deps[0]
    assert cpp.terrain.is_valid_glass_id(id)
    return id


def materialize_ToGlass_BlockFile(node: t.DerivedNode):
    path: str = node.deps[0]
    return glass.load_glass_file(path)


def materialize_ToGlassIndex_GlassAssignment_GlassID_NameMap(
    node: t.DerivedNode,
):
    entries: List[int, t.Glass] = node.deps[0]
    error_id: int = node.deps[1]
    dye_map: List[Tuple[str, int]] = node.deps[2]
    return glass.build_index(
        dict(entries),
        error_id,
        dict(dye_map),
    )


MATERIALIZATION_MAP = {
    "AddNodeToGLTF_GLTF_Str_Str_AffineTransform": materialize_AddNodeToGLTF_GLTF_Str_Str_AffineTransform,
    "AdjustBrightness_Texture_F32": materialize_AdjustBrightness_Texture_F32,
    "AdjustContrast_Texture_F32": materialize_AdjustContrast_Texture_F32,
    "AdjustSaturation_Texture_F32": materialize_AdjustSaturation_Texture_F32,
    "AffineFromAxisRotation_Vec3F32_F32": materialize_AffineFromAxisRotation_Vec3F32_F32,
    "AffineFromList_AffineTransformList": materialize_AffineFromList_AffineTransformList,
    "AffineFromQuaternion_Quaternion": materialize_AffineFromQuaternion_Quaternion,
    "AffineFromScale_Vec3F32": materialize_AffineFromScale_Vec3F32,
    "AffineFromTranslation_Vec3F32": materialize_AffineFromTranslation_Vec3F32,
    "Apply_BlockShapeTensor_Transform": materialize_Apply_BlockShapeTensor_Transform,
    "Apply_Mask_Transform": materialize_Apply_Mask_Transform,
    "Apply_TerrainTensor_Transform": materialize_Apply_TerrainTensor_Transform,
    "Apply_WaterTensor_Transform": materialize_Apply_WaterTensor_Transform,
    "Bool": materialize_Bool,
    "BoxMask_BoxList": materialize_BoxMask_BoxList,
    "Clear_BlockShapeTensor_Mask": materialize_Clear_BlockShapeTensor_Mask,
    "Clear_TerrainTensor_Mask": materialize_Clear_TerrainTensor_Mask,
    "Clear_WaterTensor_Mask": materialize_Clear_WaterTensor_Mask,
    "ColorPalettesDefinitions_ColorPaletteListList": materialize_ColorPalettesDefinitions_ColorPaletteListList,
    "PrimaryColorTable_ColorList": materialize_PrimaryColorTable_ColorList,
    "Compose_Transform_Transform": materialize_Compose_Transform_Transform,
    "CompressGLTF_GLTF": materialize_CompressGLTF_GLTF,
    "Difference_Mask_Mask": materialize_Difference_Mask_Mask,
    "EmptyBlockShapeTensor": materialize_EmptyBlockShapeTensor,
    "EmptyDyeTensor": materialize_EmptyDyeTensor,
    "EmptyMuckTensor": materialize_EmptyMuckTensor,
    "EmptyGrowthTensor": materialize_EmptyGrowthTensor,
    "EmptyMoistureTensor": materialize_EmptyMoistureTensor,
    "EmptyMask": materialize_EmptyMask,
    "EmptyTerrainTensor": materialize_EmptyTerrainTensor,
    "EmptyWaterTensor": materialize_EmptyWaterTensor,
    "ExtractAllAnimations_GLTF_Skeleton": materialize_ExtractAllAnimations_GLTF_Skeleton,
    "ExtractAnimation_Str_Str_GLTF_Skeleton": materialize_ExtractAnimation_Str_Str_GLTF_Skeleton,
    "ExtractInitialPose_GLTF_Skeleton": materialize_ExtractInitialPose_GLTF_Skeleton,
    "F32": materialize_F32,
    "F64": materialize_F64,
    "FilterLayers_Vox_StrList": materialize_FilterLayers_Vox_StrList,
    "FlattenAtlas_TextureAtlas": materialize_FlattenAtlas_TextureAtlas,
    "FlattenPosedVoxJointMap_PosedVoxJointMap": materialize_FlattenPosedVoxJointMap_PosedVoxJointMap,
    "FlipHorizontal_Texture": materialize_FlipHorizontal_Texture,
    "FlipVertical_Texture": materialize_FlipVertical_Texture,
    "GetAABBCenter_Vox": materialize_GetAABBCenter_Vox,
    "GetAttachmentTransform_ItemMeshProperties": materialize_GetAttachmentTransform_ItemMeshProperties,
    "GetColorEntry_Str_ColorPaletteList": materialize_GetColorEntry_Str_ColorPaletteList,
    "GetIconSettings_ItemMeshProperties": materialize_GetIconSettings_ItemMeshProperties,
    "GetTransform_ItemMeshProperties": materialize_GetTransform_ItemMeshProperties,
    "HueShift_Texture_F32": materialize_HueShift_Texture_F32,
    "I16": materialize_I16,
    "I32": materialize_I32,
    "I64": materialize_I64,
    "I8": materialize_I8,
    "IconSettingsFromJSON_Str": materialize_LoadIconSettingsFromJSON_Str,
    "ImageRGBA_PNGFile": materialize_ImageRGBA_PNGFIle,
    "ImageRGB_PNGFile": materialize_ImageRGB_PNGFile,
    "Intersect_Mask_Mask": materialize_Interesect_Mask_Mask,
    "List": materialize_List,
    "Literal": materialize_Literal,
    "LoadColorPaletteListFromJSONFile_StrList_Str": materialize_LoadColorPaletteListFromJSONFile_StrList_Str,
    "LoadGLTF_GLTFFile": materialize_LoadGLTF_GLTFFile,
    "LoadGroupTensor_Str": materialize_LoadGroupTensor_Str,
    "LoadItemMeshPropertiesFromJSONOrUseDefault_Str_NamedAffineTransforms": materialize_LoadItemMeshPropertiesFromJSONOrUseDefault_Str_NamedAffineTransforms,
    "LoadNamedAffineTransformsFromJSON_Str": materialize_LoadNamedAffineTransformsFromJSON_Str,
    "LoadVox_VoxFile": materialize_LoadVox_VoxFile,
    "LoadWEBM_Str": materialize_LoadWEBM_Str,
    "Merge_BlockShapeTensor_BlockShapeTensor": materialize_BlockShapeTensor_BlockShapeTensor,
    "Merge_TerrainTensor_TerrainTensor": materialize_Merge_TerrainTensor_TerrainTensor,
    "Merge_WaterTensor_WaterTensor": materialize_Merge_WaterTensor_WaterTensor,
    "Null": materialize_Null,
    "PadToSize_Texture_TextureSize_Color": materialize_PadToSize_Texture_TextureSize_Color,
    "Permute_Axes": materialize_Permute_Axes,
    "PointMask_PointList": materialize_PointMask_PointList,
    "Reflect_Bool_Bool_Bool": materialize_Reflect_Bool_Bool_Bool,
    "StripMeshNodeNamesFromGLTF_GLTF": materialize_StripMeshNodeNamesFromGLTF_GLTF,
    "RemovePaletteRangeVoxels_U8_U8_Vox": materialize_RemovePaletteRangeVoxels_U8_U8_Vox,
    "RenderVoxMap_VoxMap_PairU16_IconSettings": materialize_RenderVoxMap_VoxMap_PairU16_IconSettings,
    "RenderVoxMap_VoxMap_PairU16_Vec3F32_Vec3F32": materialize_RenderVoxMap_VoxMap_PairU16_Vec3F32_Vec3F32,
    "ReplacePaletteEntries_U8_U8_ColorPalette_Vox": materialize_ReplacePaletteEntries_U8_U8_ColorPalette_Vox,
    "Slice_BlockShapeTensor_Mask": materialize_Slice_BlockShapeTensor_Mask,
    "Slice_TerrainTensor_Mask": materialize_Slice_TerrainTensor_Mask,
    "Slice_WaterTensor_Mask": materialize_Slice_WaterTensor_Mask,
    "Str": materialize_Str,
    "SubtractLayerVoxels_Vox_Str": materialize_SubtractLayerVoxels_Vox_Str,
    "ToAtlas_BlockIndex": materialize_ToAtlas_BlockIndex,
    "ToAtlas_FloraIndex": materialize_ToAtlas_FloraIndex,
    "ToAtlas_TextureList": materialize_ToAtlas_TextureList,
    "ToBinary_BinaryFile": materialize_ToBinary_BinaryFile,
    "ToBlockID_U32": materialize_ToBlockID_U32,
    "ToBlockIndex_BlockAssignment_BlockID_NameMap": materialize_ToBlockIndex_BlockAssignment_BlockID_NameMap,
    "ToBlockIsomorphism_U32_U32": materialize_ToBlockIsomorphism_U32_U32,
    "ToBlockIsomorphismTable_BlockShapeIndex": materialize_ToBlockIsomorphismTable_BlockShapeIndex,
    "ToBlockSample_Block_Point": materialize_ToBlockSample_Block_Point,
    "ToBlockSampleTexture_CubeTexture_CubeTexture": materialize_ToBlockSampleTexture_CubeTexture_CubeTexture,
    "ToBlockSampleCriteria_Str_Str_Str_Str": materialize_ToBlockSampleCriteria_Str_Str_Str_Str,
    "ToBlockSample_BlockSampleCriteria_BlockSampleTexture": materialize_ToBlockSample_BlockSampleCriteria_BlockSampleTexture,
    "ToBlockShapeIndex_BlockShapeAssignment": materialize_ToBlockShapeIndex_BlockShapeAssignment,
    "ToBlockShapeTable_BlockShapeAssignment": materialize_ToBlockShapeTable_BlockShapeAssignment,
    "ToBlockShapeTensor_BlockTensor_BlockIsomorphism": materialize_ToBlockShapeTensor_BlockTensor_BlockIsomorphism,
    "ToBlockShapeTensor_GlassTensor_BlockIsomorphism": materialize_ToBlockShapeTensor_GlassTensor_BlockIsomorphism,
    "ToBlockShape_Mask": materialize_ToBlockShape_Mask,
    "ToBlockTensor_TerrainTensor": materialize_ToBlockTensor_TerrainTensor,
    "ToGlassTensor_TerrainTensor": materialize_ToGlassTensor_TerrainTensor,
    "ToBlock_BlockFile": materialize_ToBlock_BlockFile,
    "ToBlock_BlockSample": materialize_ToBlock_BlockSample,
    "ToBlock_BlockSampleList": materialize_ToBlock_BlockSampleList,
    "ToCubeTexture_Texture_Texture_Texture": materialize_ToCubeTexture_Texture_Texture_Texture,
    "ToFloraID_U32": materialize_ToFloraID_U32,
    "ToFloraIndex_FloraAssignment_FloraID": materialize_ToFloraIndex_FloraAssignment_FloraID,
    "ToFloraTensor_TerrainTensor": materialize_ToFloraTensor_TerrainTensor,
    "ToFlora_FloraFile": materialize_ToFlora_FloraFile,
    "ToGLB_GLTF": materialize_ToGLB_GLTF,
    "ToGLTFMesh_VoxMesh": materialize_ToGLTFMesh_VoxMesh,
    "ToGLTFMesh_VoxelMesh": materialize_ToGLTFMesh_VoxelMesh,
    "ToGLTF_GLTFMesh": materialize_ToGLTF_GLTFMesh,
    "ToGLTF_MeshJointMap_Pose": materialize_ToGLTF_MeshJointMap_Pose,
    "ToGLTF_MeshJointMap_Pose_AnimationList": materialize_ToGLTF_MeshJointMap_Pose_AnimationList,
    "ToGLTF_PosedVoxJointMap": materialize_ToGLTF_PosedVoxJointMap,
    "ToGLTF_SkinnedMeshJointMap_Pose_AnimationList": materialize_ToGLTF_SkinnedMeshJointMap_Pose_AnimationList,
    "ToGLTF_Vox": materialize_ToGLTF_Vox,
    "ToGeometryBuffer_BlockShapeTensor_OcclusionTensor_BlockShapeIndex": materialize_ToGeometryBuffer_BlockShapeTensor_OcclusionTensor_BlockShapeIndex,
    "ToGeometryBuffer_FloraTensor_GrowthTensor_FloraIndex": materialize_ToGeometryBuffer_FloraTensor_GrowthTensor_FloraIndex,
    "ToGroupIndex_BlockIndex_BlockShapeIndex_FloraIndex_BlockIndex": materialize_ToGroupIndex_BlockIndex_BlockShapeIndex_FloraIndex_BlockIndex,
    "ToGroupTensor_TerrainTensor_BlockShapeTensor_DyeTensor_MoistureTensor_GrowthTensor": materialize_ToGroupTensor_TerrainTensor_BlockShapeTensor_DyeTensor_MoistureTensor_GrowthTensor,
    "ToBlockSampleTensor_BlockTensor_DyeTensor_MuckTensor_MoistureTensor_BlockIndex": materialize_ToBlockSampleTensor_BlockTensor_DyeTensor_MuckTensor_MoistureTensor_BlockIndex,
    "ToIcon_Block": materialize_ToIcon_Block,
    "ToIcon_Glass": materialize_ToIcon_Glass,
    "ToIcon_Flora": materialize_ToIcon_Flora,
    "ToImageRGBA_PNG": materialize_ToImageRGBA_PNG,
    "ToImageRGB_PNG": materialize_ToImageRGB_PNG,
    "ToItemMesh_BlockID_BlockIndex": materialize_ToItemMesh_BlockID_BlockIndex,
    "ToItemMesh_FloraID_FloraIndex": materialize_ToItemMesh_FloraID_FloraIndex,
    "ToItemMesh_GlassID_BlockIndex": materialize_ToItemMesh_GlassID_BlockIndex,
    "ToItemMesh_GLB_AffineTransform": materialize_ToItemMesh_GLB_AffineTransform,
    "ToItemMesh_GLTF": materialize_ToItemMesh_GLTF,
    "ToItemTable_ItemAssignment": materialize_ToItemTable_ItemAssignment,
    "ToLightingBuffer_BlockTensor_BlockShapeTensor": materialize_ToLightingBuffer_BlockTensor_BlockShapeTensor,
    "ToLightingBuffer_FloraTensor_BlockShapeTensor": materialize_ToLightingBuffer_FloraTensor_BlockShapeTensor,
    "ToLightingBuffer_WaterTensor_BlockShapeTensor": materialize_ToLightingBuffer_WaterTensor_BlockShapeTensor,
    "ToMapTexture_Block_Str_Str": materialize_ToMapTexture_Block_Str_Str,
    "ToMaterialBuffer_BlockSampleTensor": materialize_ToMaterialBuffer_BlockSampleTensor,
    "ToMeshJointMap_GLTFMesh_Skeleton": materialize_ToMeshJointMap_GLTFMesh_Skeleton,
    "ToMeshJointMap_MeshJointMapData_Skeleton": materialize_ToMeshJointMap_MeshJointMapData_Skeleton,
    "ToMeshJointMap_PosedVoxJointMap_Pose_GLTFTransform": materialize_ToMeshJointMap_PosedVoxJointMap_Pose_GLTFTransform,
    "ToMesh_BlockGeometryBuffer_BlockMaterialBuffer_LightingBuffer_BlockAtlas": materialize_ToMesh_BlockGeometryBuffer_BlockMaterialBuffer_LightingBuffer_BlockAtlas,
    "ToMesh_BlockMesh_FloraMesh_GlassMesh": materialize_ToMesh_BlockMesh_FloraMesh_GlassMesh,
    "ToMesh_FloraGeometryBuffer_LightingBuffer_FloraAtlas": materialize_ToMesh_FloraGeometryBuffer_LightingBuffer_FloraAtlas,
    "ToMesh_GroupTensor_GroupIndex": materialize_ToMesh_GroupTensor_GroupIndex,
    "ToMesh_WaterTensor_LightingBuffer": materialize_ToMesh_WaterTensor_LightingBuffer,
    "ToMreaTexture_BlockSample_Dir": materialize_ToMreaTexture_BlockSample_Dir,
    "ToOcclusionTensor_BlockShapeTensor_BlockShapeIndex": materialize_ToOcclusionTensor_BlockShapeTensor_BlockShapeIndex,
    "ToPNG_Str": materialize_ToPNG_Str,
    "ToPNG_Texture": materialize_ToPNG_Texture,
    "ToPosedVoxJointMapFromVoxLayers_Vox_Skeleton": materialize_ToPosedVoxJointMapFromVoxLayers_Vox_Skeleton,
    "ToPosedVoxJointMapFromWearables_WearableSlotSchema_WearableList": materialize_ToPosedVoxJointMapFromWearables_WearableSlotSchema_WearableList,
    "ToSkinnedMeshJointMap_PosedVoxJointMap_Pose_GLTFTransform_StrList": materialize_ToSkinnedMeshJointMap_PosedVoxJointMap_Pose_GLTFTransform_StrList,
    "ToShaper_BlockShapeIndex_U32_ShapeList": materialize_ToShaper_BlockShapeIndex_U32_ShapeList,
    "ToShaper_BlockShapeIndex_U32_ShapeList_Transform": materialize_ToShaper_BlockShapeIndex_U32_ShapeList_Transform,
    "ToShaperTable_ShaperIndex": materialize_ToShaperTable_ShaperIndex,
    "ToSurfaceTensor_BlockTensor_OcclusionTensor": materialize_ToSurfaceTensor_BlockTensor_OcclusionTensor,
    "ToSurfaceTensor_WaterTensor": materialize_ToSurfaceTensor_WaterTensor,
    "ToTerrainID_BlockID": materialize_ToTerrainID_BlockID,
    "ToTerrainID_FloraID": materialize_ToTerrainID_FloraID,
    "ToTerrainID_GlassID": materialize_ToTerrainID_GlassID,
    "ToTerrainTable_TerrainAssignment": materialize_ToTerrainTable_TerrainAssignment,
    "ToTexture_BlockSample_Dir": materialize_ToTexture_BlockSample_Dir,
    "ToVoxMap_Vox": materialize_ToVoxMap_Vox,
    "ToVoxMesh_VoxMap": materialize_ToVoxMesh_VoxMap,
    "ToWireframeMesh_GroupTensor_BlockShapeIndex": materialize_ToWireframeMesh_GroupTensor_BlockShapeIndex,
    "TransformGLTFMesh_GLTFMesh_GLTFTransform": materialize_TransformGLTFMesh_GLTFMesh_GLTFTransform,
    "TransformGLTF_GLTF_AffineTransform": materialize_TransformGLTF_GLTF_AffineTransform,
    "TransformGLTF_GLTF_GLTFTransform": materialize_TransformGLTF_GLTF_GLTFTransform,
    "TransformPose_Pose_GLTFTransform": materialize_Transform_Pose_GLTFTransform,
    "Translate_I32_I32_I32": materialize_Translate_I32_I32_I32,
    "Tuple": materialize_Tuple,
    "U16": materialize_U16,
    "U32": materialize_U32,
    "U64": materialize_U64,
    "U8": materialize_U8,
    "Union_Mask_Mask": materialize_Union_Mask_Mask,
    "WearablesDefinitions_WearableSlotSchema_WearableDefinitionList_Skeleton": materialize_WearablesDefinitions_WearableSlotSchema_WearableDefinitionList_Skeleton,
    "Write_BlockShapeTensor_Mask_BlockIsomorphism": materialize_Write_BlockShapeTensor_Mask_BlockIsomorphism,
    "Write_TerrainTensor_Mask_TerrainID": materialize_Write_TerrainTensor_Mask_TerrainID,
    "Write_WaterTensor_Mask_WaterValue": materialize_Write_WaterTensor_Mask_WaterValue,
    "PrimaryColorTable_ColorList": materialize_PrimaryColorTable_ColorList,
    "ToBlueprintGroupDefinition_U32_Str_GroupTensor": materialize_ToBlueprintGroupDefinition_U32_Str_GroupTensor,
    "ToPlaceable_U32_Point_Orientation": materialize_ToPlaceable_U32_Point_Orientation,
    "ToBlueprintGroupDefinitions_BlueprintGroupDefinitions": materialize_ToBlueprintGroupDefinitions_BlueprintGroupDefinitions,
    "Apply_DyeTensor_Transform": materialize_Apply_DyeTensor_Transform,
    "Apply_MoistureTensor_Transform": materialize_Apply_MoistureTensor_Transform,
    "Clear_DyeTensor_Mask": materialize_Clear_DyeTensor_Mask,
    "Clear_MoistureTensor_Mask": materialize_Clear_MoistureTensor_Mask,
    "Merge_DyeTensor_DyeTensor": materialize_Merge_DyeTensor_DyeTensor,
    "Merge_MoistureTensor_MoistureTensor": materialize_Merge_MoistureTensor_MoistureTensor,
    "Slice_DyeTensor_Mask": materialize_Slice_DyeTensor_Mask,
    "Slice_MoistureTensor_Mask": materialize_Slice_MoistureTensor_Mask,
    "Write_DyeTensor_Mask_U8": materialize_Write_DyeTensor_Mask_U8,
    "Write_MoistureTensor_Mask_U8": materialize_Write_MoistureTensor_Mask_U8,
    "Apply_GrowthTensor_Transform": materialize_Apply_GrowthTensor_Transform,
    "Clear_GrowthTensor_Mask": materialize_Clear_GrowthTensor_Mask,
    "Merge_GrowthTensor_GrowthTensor": materialize_Merge_GrowthTensor_GrowthTensor,
    "Slice_GrowthTensor_Mask": materialize_Slice_GrowthTensor_Mask,
    "Write_GrowthTensor_Mask_U8": materialize_Write_GrowthTensor_Mask_U8,
    "ToFloraSampleCriteria_Str_Str": materialize_ToFloraSampleCriteria_Str_Str,
    "ToFloraSampleGeometry_FloraVertices_FloraIndices": materialize_ToFloraSampleGeometry_FloraVertices_FloraIndices,
    "ToFloraSampleMaterial_TextureList": materialize_ToFloraSampleMaterial_TextureList,
    "ToFloraSample_FloraSampleCriteria_FloraSampleGeometry_FloraSampleMaterial_FloraSampleTransform": materialize_ToFloraSample_FloraSampleCriteria_FloraSampleGeometry_FloraSampleMaterial_FloraSampleTransform,
    "ToGlassOcclusionTensor_BlockShapeTensor_GlassTensor_DyeTensor_BlockShapeIndex": materialize_ToGlassOcclusionTensor_BlockShapeTensor_GlassTensor_DyeTensor_BlockShapeIndex,
    "ToBlockSampleTensor_GlassTensor_DyeTensor_MuckTensor_MoistureTensor_BlockIndex": materialize_ToBlockSampleTensor_GlassTensor_DyeTensor_MuckTensor_MoistureTensor_BlockIndex,
    "ToLightingBuffer_GlassTensor_BlockShapeTensor": materialize_ToLightingBuffer_GlassTensor_BlockShapeTensor,
    "ToGlassMesh_BlockGeometryBuffer_BlockMaterialBuffer_LightingBuffer_BlockAtlas": materialize_ToGlassMesh_BlockGeometryBuffer_BlockMaterialBuffer_LightingBuffer_BlockAtlas,
    "ToGlassID_U32": materialize_ToGlassID_U32,
    "ToGlass_BlockFile": materialize_ToGlass_BlockFile,
    "ToGlassIndex_GlassAssignment_GlassID_NameMap": materialize_ToGlassIndex_GlassAssignment_GlassID_NameMap,
}


def materialize(node: Union[t.LiteralNode, t.DerivedNode]):
    try:
        return MATERIALIZATION_MAP[node.kind](node)
    except Exception as e:
        raise t.MaterializationError(f"Error materializing node: {node}") from e
