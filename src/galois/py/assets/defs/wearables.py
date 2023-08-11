from collections import OrderedDict

from lang import FuncGenerator, TypeGenerator


def define_types(g: TypeGenerator):
    t = g.types

    g.define(
        "VoxMesh",
        t.External("VoxMesh"),
        "A mesh derived from a MagicaVoxel .vox file.",
    )

    g.define(
        "Skeleton",
        t.Tuple(t.Str(), t.List(t.Reference("Skeleton"))),
        "Skinning type",
    )
    g.define(
        "Vox",
        t.External("Vox"),
        "Captures the data described by a MagicaVoxel .vox file",
    )
    g.define(
        "VoxMap",
        t.External("VoxMap"),
        "Essentially a paletted numpy array, derived from a .vox file.",
    )
    g.define(
        "GLTF",
        t.External("GLTF"),
        "Represents a glTF, which can be saved to disk or transformed in various ways.",
    )
    g.define(
        "GLB",
        t.External("GLB"),
        "Represents a glTF that will be saved to disk in binary form, in the .glb format.",
    )
    g.define(
        "GLTFMesh",
        t.External("GLTFMesh"),
        "A mesh formatted such that it is easy to embed it into a GLTF file.",
    )
    g.define(
        "Pose",
        t.External("Pose"),
        "A Pose is a skeleton along with associated per-joint transformations.",
    )
    g.define(
        "Animation",
        t.External("Animation"),
        "An animation is a skeleton associated with an animated pose.",
    )
    g.define("AnimationList", t.List(t.Animation()))

    g.define(
        "MeshJointMap",
        t.External("MeshJointMap"),
        "A list of meshes assigned to joints on a skeleton",
    )
    g.define(
        "SkinnedMeshJointMap",
        t.External("SkinnedMeshJointMap"),
        "A skinned mesh along with joint mapping information that can be used "
        "to tie it to an animation.",
    )
    g.define(
        "PosedVoxJointMap",
        t.External("PosedVoxJointMap"),
        "A list of .vox voxel images assigned to joints on a skeleton",
    )
    g.define(
        "MeshJointMapData",
        t.List(t.Tuple(t.GLTFMesh(), t.Str())),
        'Used to manually assemble a "MeshJointMap"',
    )
    g.define(
        "GLTFTransform",
        t.Tuple(
            # Translation
            t.Tuple(t.F32(), t.F32(), t.F32()),
            # Rotation (as a unit quaternion)
            t.Tuple(t.F32(), t.F32(), t.F32(), t.F32()),
            # Scale
            t.Tuple(t.F32(), t.F32(), t.F32()),
        ),
        "A set of affine transformations that map to how they are defined in glTF files.",
    )

    # Define wearable types.
    g.define("WearableSlotId", t.Str())
    g.define("WearableSlotSchema", t.List(t.WearableSlotId()))
    g.define("Wearable", t.Tuple(t.WearableSlotId(), t.PosedVoxJointMap()))
    g.define("WearableList", t.List(t.Wearable()))

    g.define("WearableDefinition", t.Tuple(t.Str(), t.Str()))
    g.define("WearableDefinitionList", t.List(t.WearableDefinition()))
    g.define("JointPolygonOffsets", t.List(t.Tuple(t.Str(), t.I8())))

    g.define("EyeShape", t.Tuple(t.Str(), t.Str(), t.Str()))
    g.define("EyeShapeList", t.List(t.EyeShape()))

    g.define(
        "IconSettings",
        t.External("IconSettings"),
        "A set of properties defining how to render an icon.",
    )


def define_funcs(g: FuncGenerator):
    g.define(
        name="LoadGLTF",
        args=OrderedDict(path="GLTFFile"),
        type="GLTF",
        desc="Loads a GLTF file from the given path",
    )

    g.define(
        name="StripMeshNodeNamesFromGLTF",
        args=OrderedDict(gltf="GLTF"),
        type="GLTF",
        desc="Removes the optional name from all mesh nodes from a GLTF file. Useful if the GLTF file is intended to be a vessel for animations, but the joint node names have a name conflict with the mesh node names. Stripping the mesh node names ensures the joint node names don't get mangled and confuse upstream consumers.",
    )

    g.define(
        name="ExtractInitialPose",
        args=OrderedDict(gltf="GLTF", skeleton="Skeleton"),
        type="Pose",
        desc=[
            "Extracts the static initial pose for a given skeleton from a GLTF file. ",
            "This is useful for extracting reference poses (e.g. a T pose) from gltf files.",
        ],
    )
    g.define(
        name="TransformPose",
        args=OrderedDict(
            pose="Pose",
            translation="GLTFTransform",
        ),
        type="Pose",
        desc=[
            "Applies an affine transform to a pose to get a new pose. This is useful for ",
            "rotating a skeleton around to accomodate for differences in expectations ",
            "between the art assets and how their used in-game.",
        ],
    )
    g.define(
        name="ExtractAnimation",
        args=OrderedDict(
            destinationName="Str",
            sourceName="Str",
            gltf="GLTF",
            skeleton="Skeleton",
        ),
        type="Animation",
        desc=[
            "Extracts a given animation from a glTF file, such that it could then ",
            "be inserted into another glTF file. The sourceName defines the ",
            "name of the animation in the source glTF file, and the destinationName ",
            "defines the name of the animation in glTF files that reference this.",
        ],
    )
    g.define(
        name="ExtractAllAnimations",
        args=OrderedDict(
            gltf="GLTF",
            skeleton="Skeleton",
        ),
        type="AnimationList",
        desc=[
            "Extracts all animations from a glTF file, such that they could then ",
            "be inserted into another glTF file.",
        ],
    )
    g.define(
        name="ToMeshJointMap",
        args=OrderedDict(data="GLTFMesh", skeleton="Skeleton"),
        type="MeshJointMap",
        desc="Replicate a mesh to all joints in the skeleton.",
    )
    #
    g.define(
        name="ToMeshJointMap",
        args=OrderedDict(data="MeshJointMapData", skeleton="Skeleton"),
        type="MeshJointMap",
        desc=[
            "Constructs a `MeshJointMap` from manually entered data. Effectively this ",
            "lets you assign a mesh to each joint of a skeleton.",
        ],
    )
    g.define(
        name="ToPosedVoxJointMapFromVoxLayers",
        args=OrderedDict(data="Vox", skeleton="Skeleton"),
        type="PosedVoxJointMap",
        desc=[
            "Extracts a vox-per-joint by associating .vox voxel data with each joint ",
            "of a skeleton.",
        ],
    )
    g.define(
        name="ToPosedVoxJointMapFromWearables",
        args=OrderedDict(schema="WearableSlotSchema", wearables="WearableList"),
        type="PosedVoxJointMap",
        desc=[
            "Accumulates multiple vox maps per skeleton joint in the schema-defined order ",
            "to produce a new output vox map per skeleton joint.",
        ],
    )
    g.define(
        name="FlattenPosedVoxJointMap",
        args=OrderedDict(posedVoxJointMap="PosedVoxJointMap"),
        type="VoxMap",
        desc=[
            "Flattens a posed vox joint map into a single vox map, losing joint information.",
        ],
    )
    g.define(
        name="ToMeshJointMap",
        args=OrderedDict(
            data="PosedVoxJointMap",
            referencePose="Pose",
            alignTransform="GLTFTransform",
        ),
        type="MeshJointMap",
        desc=[
            "Translates a vox-per-joint to a mesh-per-joint. The alignment transform is applied ",
            "to the entire vox map/mesh before connecting it to the reference pose.",
        ],
    )
    g.define(
        name="ToSkinnedMeshJointMap",
        args=OrderedDict(
            data="PosedVoxJointMap",
            referencePose="Pose",
            alignTransform="GLTFTransform",
            jointOrdering="StrList",
        ),
        type="SkinnedMeshJointMap",
        desc=[
            "Translates a vox-per-joint to a single mesh skinned with "
            "per-vertex joint information."
            "The joint ordering associates a joint index with each skeleton "
            "bone, which is used to map per-vertex joint indices with joint "
            "uniforms in the shader at runtime, but it also acts as an "
            "ordering for render order, where objects appearing earlier in the "
            "list will appear to render on top of objects appearing later. "
            "Render ordering can be used to eliminate z-fighting."
        ],
    )

    g.define(
        name="LoadVox",
        args=OrderedDict(file="VoxFile"),
        type="Vox",
        desc="Load a .vox file (from MagicaVoxel) into an object.",
    )
    g.define(
        name="ToVoxMap",
        args=OrderedDict(vox="Vox"),
        type="VoxMap",
        desc=[
            "Assumes there's only one model inside of the given .vox file, and extracts it",
            "into a paletted numpy array.",
        ],
    )
    g.define(
        name="ToVoxMesh",
        args=OrderedDict(vox="VoxMap"),
        type="VoxMesh",
        desc="",
    )
    g.define(
        name="ToGLTFMesh",
        args=OrderedDict(voxMesh="VoxMesh"),
        type="GLTFMesh",
        desc="",
    )

    g.define(
        name="TransformGLTFMesh",
        args=OrderedDict(
            mesh="GLTFMesh",
            translation="GLTFTransform",
        ),
        type="GLTFMesh",
        desc="Applies an affine transformation to a GLTFMesh, resulting in a new GLTFMesh.",
    )

    g.define(
        name="TransformGLTF",
        args=OrderedDict(
            gltf="GLTF",
            transform="GLTFTransform",
        ),
        type="GLTF",
        desc="Applies an affine transformation to a GLTF, resulting in a new GLTF.",
    )
    g.define(
        name="TransformGLTF",
        args=OrderedDict(
            gltf="GLTF",
            transform="AffineTransform",
        ),
        type="GLTF",
        desc="Applies an affine transformation to a GLTF, resulting in a new GLTF.",
    )

    g.define(
        name="ToGLTFMesh",
        args=OrderedDict(mesh="VoxelMesh"),
        type="GLTFMesh",
        desc=[
            "Converts a voxel mesh to a glTF mesh, a useful tool for generating some",
            "GLTFMesh content.",
        ],
    )
    g.define(
        name="ToGLTF",
        args=OrderedDict(
            meshJointMap="MeshJointMap",
            initialPose="Pose",
            animations="AnimationList",
        ),
        type="GLTF",
        desc=[
            "Combines a mesh joint map, iniital pose, and set of animations together into ",
            "a glTF object that describes a skeleton with meshes attached to each joint, ",
            "with both an initial reference pose as well as a set of animations.",
        ],
    )
    g.define(
        name="ToGLTF",
        args=OrderedDict(
            meshJointMap="SkinnedMeshJointMap",
            initialPose="Pose",
            animations="AnimationList",
        ),
        type="GLTF",
        desc=[
            "Like the `ToGLTF` function with a MeshJointMap parameter, but "
            "instead results in an output GLTF file with vertex skinning.",
        ],
    )

    g.define(
        name="ToGLTF",
        args=OrderedDict(
            posedVoxJointMap="PosedVoxJointMap",
        ),
        type="GLTF",
        desc="...",
    )

    g.define(
        name="ToGLTF",
        args=OrderedDict(
            vox="Vox",
        ),
        type="GLTF",
        desc="...",
    )

    g.define(
        name="ToGLTF",
        args=OrderedDict(meshJointMap="MeshJointMap", pose="Pose"),
        type="GLTF",
        desc=[
            "Creates a glTF object without any animations where we just have a posed ",
            "skeleton with meshes attached to each joint.",
        ],
    )

    g.define(
        name="ToGLTF",
        args=OrderedDict(gltfMesh="GLTFMesh"),
        type="GLTF",
        desc="Convert a single GLTFMesh into a GLTF file that contains it.",
    )

    g.define(
        name="AddNodeToGLTF",
        args=OrderedDict(
            gltf="GLTF",
            nodeName="Str",
            parentNode="Str",
            transform="AffineTransform",
        ),
        type="GLTF",
        desc="Adds a new child node to the GLTF under a given parent node and with the given transform.",
    )

    g.define(
        name="CompressGLTF",
        args=OrderedDict(gltf="GLTF"),
        type="GLB",
        desc="Compress a GLTF file, and convert it to a GLB.",
    )

    g.define(
        name="ToGLB",
        args=OrderedDict(gltf="GLTF"),
        type="GLB",
        desc="Convert a GLTF file to a GLB, which contains all the same information but is serialized to binary.",
    )

    g.define(
        name="ReplacePaletteEntries",
        args=OrderedDict(
            start="U8", end="U8", newColors="ColorPalette", vox="Vox"
        ),
        type="Vox",
        desc="Replace the color entries in the specified color range in the vox object with those specified in the palette, and return a new vox object.",
    )

    g.define(
        name="RemovePaletteRangeVoxels",
        args=OrderedDict(start="U8", end="U8", vox="Vox"),
        type="Vox",
        desc="Removes all voxels with indices in the specified range.",
    )

    g.define(
        name="SubtractLayerVoxels",
        args=OrderedDict(vox="Vox", layerName="Str"),
        type="Vox",
        desc="Subtracts all non-empty voxels in the specified layer from all the other layers in the vox.",
    )

    g.define(
        name="WearablesDefinitions",
        args=OrderedDict(
            wearableSlotSchema="WearableSlotSchema",
            wearableDefinitions="WearableDefinitionList",
            characterSkeleton="Skeleton",
        ),
        type="SourceFile",
        desc="Compiles a list of wearables into a JSON file that defines the data.",
    )

    g.define(
        name="FilterLayers",
        args=OrderedDict(
            vox="Vox",
            keepLayers="StrList",
        ),
        type="Vox",
        desc="Produces a new Vox object that contains only the specified layers.",
    )

    g.define(
        name="RenderVoxMap",
        args=OrderedDict(
            vox="VoxMap",
            outputsize="PairU16",
            cameraDirection="Vec3F32",
            lightingDirection="Vec3F32",
        ),
        type="Texture",
        desc="Rasterizes a given vox file and returns the resulting image. Will zoom such that the object fits in the picture.",
    )

    g.define(
        name="IconSettingsFromJSON",
        args=OrderedDict(json="Str"),
        type="IconSettings",
        desc="Load IconSettings from a provided JSON-string",
    )

    g.define(
        name="RenderVoxMap",
        args=OrderedDict(
            vox="VoxMap",
            outputsize="PairU16",
            iconSettings="IconSettings",
        ),
        type="Texture",
        desc="Rasterizes a given vox file and returns the resulting image, according to the icon settings object provided.",
    )

    g.define(
        name="GetAABBCenter",
        args=OrderedDict(
            vox="Vox",
        ),
        type="Vec3F32",
        desc="Returns the translation that when applied to the given .vox object, would place its center of mass at the origin.",
    )
