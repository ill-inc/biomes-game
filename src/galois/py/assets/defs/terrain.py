from collections import OrderedDict

from lang import FuncGenerator, TypeGenerator


def define_types(g: TypeGenerator):
    t = g.types

    def records(*fields):
        return t.List(t.Tuple(*fields))

    # Define block types.
    g.define("CubeTexture", t.External("CubeTexture"))
    g.define("Block", t.External("Block"))
    g.define("BlockID", t.External("BlockID"))
    g.define("BlockSample", t.External("BlockSample"))
    g.define("BlockSampleList", t.List(t.BlockSample()))
    g.define("BlockSampleCriteria", t.External("BlockSampleCriteria"))
    g.define("BlockSampleTexture", t.External("BlockSampleTexture"))
    g.define("BlockShape", t.External("BlockShape"))
    g.define("BlockIsomorphism", t.External("BlockIsomorphism"))

    g.define("BlockAssignment", records(t.BlockID(), t.Block()))
    g.define("BlockShapeAssignment", records(t.U32(), t.Str(), t.BlockShape()))
    g.define("BlockIndex", t.External("BlockIndex"))
    g.define("BlockShapeIndex", t.External("BlockShapeIndex"))
    g.define("BlockTensor", t.External("BlockTensor"))
    g.define("BlockShapeTensor", t.External("BlockShapeTensor"))
    g.define("BlockShapeTable", t.External("BlockShapeTable"))
    g.define("BlockIsomorphismTable", t.External("BlockIsomorphismTable"))
    g.define("DyeTensor", t.External("DyeTensor"))
    g.define("MuckTensor", t.External("MuckTensor"))
    g.define("MoistureTensor", t.External("MoistureTensor"))
    g.define("BlockSampleTensor", t.External("BlockSampleTensor"))

    g.define("BlockAtlas", t.External("BlockAtlas"))
    g.define("BlockMaterialBuffer", t.External("BlockMaterialBuffer"))
    g.define("BlockGeometryBuffer", t.External("BlockGeometryBuffer"))
    g.define("BlockMesh", t.External("BlockMesh"))
    g.define("BlockItemMesh", t.External("BlockItemMesh"))

    # Define flora types.
    g.define("Flora", t.External("Flora"))
    g.define("FloraID", t.External("FloraID"))
    g.define("FloraSample", t.External("FloraSample"))
    g.define("FloraVertices", t.List(t.List(t.F32())))
    g.define("FloraIndices", t.List(t.U16()))
    g.define("FloraSampleList", t.List(t.FloraSample()))
    g.define("GrowthTensor", t.External("GrowthTensor"))

    g.define("FloraSampleTransform", t.External("FloraSampleTransform"))
    g.define("FloraSampleCriteria", t.External("FloraSampleCriteria"))
    g.define("FloraSampleGeometry", t.External("FloraSampleGeometry"))
    g.define("FloraSampleMaterial", t.External("FloraSampleMaterial"))

    g.define("FloraAssignment", t.List(t.Tuple(t.FloraID(), t.Flora())))
    g.define("FloraIndex", t.External("FloraIndex"))
    g.define("FloraTensor", t.External("FloraTensor"))

    g.define("FloraAtlas", t.External("FloraAtlas"))
    g.define("FloraGeometryBuffer", t.External("FloraGeometryBuffer"))
    g.define("FloraMesh", t.External("FloraMesh"))
    g.define("FloraItemMesh", t.External("FloraItemMesh"))

    # Define glass types
    g.define("Glass", t.External("Glass"))
    g.define("GlassID", t.External("GlassID"))
    g.define("GlassAssignment", records(t.GlassID(), t.Glass()))
    g.define("GlassFile", t.External("GlassFile"))
    g.define("GlassItemMesh", t.External("GlassItemMesh"))
    g.define("GlassTensor", t.External("GlassTensor"))
    g.define("GlassMesh", t.External("GlassMesh"))

    # Define terrain types.
    g.define("TerrainID", t.External("TerrainID"))
    g.define("TerrainTensor", t.External("TerrainTensor"))
    g.define("TerrainAssignment", t.List(t.Tuple(t.Str(), t.TerrainID())))
    g.define("TerrainMesh", t.External("TerrainMesh"))

    # Define utility types.
    g.define("OcclusionTensor", t.External("OcclusionTensor"))
    g.define("LightingBuffer", t.External("LightingBuffer"))
    g.define("ColorList", t.List(t.Tuple(t.Str(), t.U32())))
    g.define("NameMap", records(t.Str(), t.U8()))


def define_funcs(g: FuncGenerator):
    # Define terrain ID registration routines
    g.define(
        name="ToTerrainID",
        args=OrderedDict(id="BlockID"),
        type="TerrainID",
    )
    g.define(
        name="ToTerrainID",
        args=OrderedDict(id="FloraID"),
        type="TerrainID",
    )
    g.define(
        name="ToTerrainID",
        args=OrderedDict(id="GlassID"),
        type="TerrainID",
    )

    # Define terrain CSG routines
    g.define(
        name="EmptyTerrainTensor",
        args=OrderedDict(),
        type="TerrainTensor",
    )
    g.define(
        name="Write",
        args=OrderedDict(src="TerrainTensor", at="Mask", val="TerrainID"),
        type="TerrainTensor",
    )
    g.define(
        name="Merge",
        args=OrderedDict(lhs="TerrainTensor", rhs="TerrainTensor"),
        type="TerrainTensor",
    )
    g.define(
        name="Clear",
        args=OrderedDict(src="TerrainTensor", at="Mask"),
        type="TerrainTensor",
    )
    g.define(
        name="Slice",
        args=OrderedDict(src="TerrainTensor", at="Mask"),
        type="TerrainTensor",
    )
    g.define(
        name="Apply",
        args=OrderedDict(src="TerrainTensor", by="Transform"),
        type="TerrainTensor",
    )

    # Define terrain tensor extraction routines
    g.define(
        name="ToBlockTensor",
        args=OrderedDict(src="TerrainTensor"),
        type="BlockTensor",
    )
    g.define(
        name="ToFloraTensor",
        args=OrderedDict(src="TerrainTensor"),
        type="FloraTensor",
    )
    g.define(
        name="ToGlassTensor",
        args=OrderedDict(src="TerrainTensor"),
        type="GlassTensor",
    )

    # Define terrain meshing routines.
    g.define(
        name="ToMesh",
        args=OrderedDict(
            block="BlockMesh",
            flora="FloraMesh",
            glass="GlassMesh",
        ),
        type="TerrainMesh",
    )

    # Define occlusion and lighting routines
    g.define(
        name="ToOcclusionTensor",
        args=OrderedDict(src="BlockShapeTensor", index="BlockShapeIndex"),
        type="OcclusionTensor",
    )
    g.define(
        name="ToGlassOcclusionTensor",
        args=OrderedDict(
            src="BlockShapeTensor",
            glass="GlassTensor",
            dyes="DyeTensor",
            index="BlockShapeIndex",
        ),
        type="OcclusionTensor",
    )
    g.define(
        name="ToLightingBuffer",
        args=OrderedDict(surface="BlockTensor", shapes="BlockShapeTensor"),
        type="LightingBuffer",
    )
    g.define(
        name="ToLightingBuffer",
        args=OrderedDict(surface="FloraTensor", shapes="BlockShapeTensor"),
        type="LightingBuffer",
    )
    g.define(
        name="ToLightingBuffer",
        args=OrderedDict(surface="GlassTensor", shapes="BlockShapeTensor"),
        type="LightingBuffer",
    )

    # Define block definition routines
    g.define(
        name="ToBlockID",
        args=OrderedDict(id="U32"),
        type="BlockID",
    )
    g.define(
        name="ToCubeTexture",
        args=OrderedDict(
            side="Texture",
            top="Texture",
            bottom="Texture",
        ),
        type="CubeTexture",
    )
    g.define(
        name="ToBlockSampleCriteria",
        args=OrderedDict(position="Str", dye="Str", muck="Str", moisture="Str"),
        type="BlockSampleCriteria",
    )
    g.define(
        name="ToBlockSampleTexture",
        args=OrderedDict(
            color="CubeTexture",
            mrea="CubeTexture",
        ),
        type="BlockSampleTexture",
    )
    g.define(
        name="ToBlockSample",
        args=OrderedDict(
            criteria="BlockSampleCriteria",
            texture="BlockSampleTexture",
        ),
        type="BlockSample",
    )
    g.define(
        name="ToBlock",
        args=OrderedDict(sample="BlockSample"),
        type="Block",
    )
    g.define(
        name="ToBlock",
        args=OrderedDict(samples="BlockSampleList"),
        type="Block",
    )
    g.define(
        name="ToBlock",
        args=OrderedDict(file="BlockFile"),
        type="Block",
    )

    # Define glass definition routines
    g.define(
        name="ToGlassID",
        args=OrderedDict(id="U32"),
        type="GlassID",
    )
    g.define(
        name="ToGlass",
        args=OrderedDict(file="BlockFile"),
        type="Glass",
    )
    g.define(
        name="ToGlassIndex",
        args=OrderedDict(
            assignment="GlassAssignment",
            error="GlassID",
            dyeMap="NameMap",
        ),
        type="BlockIndex",
    )

    # Define growth definition routines
    g.define(
        name="EmptyGrowthTensor",
        args=OrderedDict(),
        type="GrowthTensor",
    )
    g.define(
        name="Write",
        args=OrderedDict(src="GrowthTensor", at="Mask", dye="U8"),
        type="GrowthTensor",
    )
    g.define(
        name="Merge",
        args=OrderedDict(lhs="GrowthTensor", rhs="GrowthTensor"),
        type="GrowthTensor",
    )
    g.define(
        name="Clear",
        args=OrderedDict(src="GrowthTensor", at="Mask"),
        type="GrowthTensor",
    )
    g.define(
        name="Slice",
        args=OrderedDict(src="GrowthTensor", at="Mask"),
        type="GrowthTensor",
    )
    g.define(
        name="Apply",
        args=OrderedDict(src="GrowthTensor", by="Transform"),
        type="GrowthTensor",
    )

    # Define dye definition routines
    g.define(
        name="EmptyDyeTensor",
        args=OrderedDict(),
        type="DyeTensor",
    )
    g.define(
        name="Write",
        args=OrderedDict(src="DyeTensor", at="Mask", dye="U8"),
        type="DyeTensor",
    )
    g.define(
        name="Merge",
        args=OrderedDict(lhs="DyeTensor", rhs="DyeTensor"),
        type="DyeTensor",
    )
    g.define(
        name="Clear",
        args=OrderedDict(src="DyeTensor", at="Mask"),
        type="DyeTensor",
    )
    g.define(
        name="Slice",
        args=OrderedDict(src="DyeTensor", at="Mask"),
        type="DyeTensor",
    )
    g.define(
        name="Apply",
        args=OrderedDict(src="DyeTensor", by="Transform"),
        type="DyeTensor",
    )

    # Define moisture definition routines
    g.define(
        name="EmptyMoistureTensor",
        args=OrderedDict(),
        type="MoistureTensor",
    )
    g.define(
        name="Write",
        args=OrderedDict(src="MoistureTensor", at="Mask", moisture="U8"),
        type="MoistureTensor",
    )
    g.define(
        name="Merge",
        args=OrderedDict(lhs="MoistureTensor", rhs="MoistureTensor"),
        type="MoistureTensor",
    )
    g.define(
        name="Clear",
        args=OrderedDict(src="MoistureTensor", at="Mask"),
        type="MoistureTensor",
    )
    g.define(
        name="Slice",
        args=OrderedDict(src="MoistureTensor", at="Mask"),
        type="MoistureTensor",
    )
    g.define(
        name="Apply",
        args=OrderedDict(src="MoistureTensor", by="Transform"),
        type="MoistureTensor",
    )

    # Define muck definition routines
    g.define(
        name="EmptyMuckTensor",
        args=OrderedDict(),
        type="MuckTensor",
    )

    # Define block shape routines
    g.define(
        name="ToBlockIsomorphism",
        args=OrderedDict(shape="U32", transform="U32"),
        type="BlockIsomorphism",
    )
    g.define(
        name="ToBlockShape",
        args=OrderedDict(mask="Mask"),
        type="BlockShape",
    )
    g.define(
        name="ToBlockShapeTensor",
        args=OrderedDict(tensor="BlockTensor", shape="BlockIsomorphism"),
        type="BlockShapeTensor",
    )
    g.define(
        name="ToBlockShapeTensor",
        args=OrderedDict(tensor="GlassTensor", shape="BlockIsomorphism"),
        type="BlockShapeTensor",
    )
    g.define(
        name="EmptyBlockShapeTensor",
        args=OrderedDict(),
        type="BlockShapeTensor",
    )
    g.define(
        name="Write",
        args=OrderedDict(
            src="BlockShapeTensor", at="Mask", val="BlockIsomorphism"
        ),
        type="BlockShapeTensor",
    )
    g.define(
        name="Merge",
        args=OrderedDict(lhs="BlockShapeTensor", rhs="BlockShapeTensor"),
        type="BlockShapeTensor",
    )
    g.define(
        name="Clear",
        args=OrderedDict(src="BlockShapeTensor", at="Mask"),
        type="BlockShapeTensor",
    )
    g.define(
        name="Slice",
        args=OrderedDict(src="BlockShapeTensor", at="Mask"),
        type="BlockShapeTensor",
    )
    g.define(
        name="Apply",
        args=OrderedDict(src="BlockShapeTensor", by="Transform"),
        type="BlockShapeTensor",
    )

    # Define block indexing routines
    g.define(
        name="ToBlockIndex",
        args=OrderedDict(
            assignment="BlockAssignment",
            error="BlockID",
            dyeMap="NameMap",
        ),
        type="BlockIndex",
    )
    g.define(
        name="ToBlockShapeIndex",
        args=OrderedDict(assignment="BlockShapeAssignment"),
        type="BlockShapeIndex",
    )

    # Define block condition routines
    g.define(
        name="ToBlockSampleTensor",
        args=OrderedDict(
            src="BlockTensor",
            dyes="DyeTensor",
            muck="MuckTensor",
            moistures="MoistureTensor",
            index="BlockIndex",
        ),
        type="BlockSampleTensor",
    )
    g.define(
        name="ToBlockSampleTensor",
        args=OrderedDict(
            src="GlassTensor",
            dyes="DyeTensor",
            muck="MuckTensor",
            moistures="MoistureTensor",
            index="BlockIndex",
        ),
        type="BlockSampleTensor",
    )

    # Define block meshing routines
    g.define(
        name="ToSurfaceTensor",
        args=OrderedDict(src="BlockTensor", occlusion="OcclusionTensor"),
        type="BlockTensor",
    )
    g.define(
        name="ToMaterialBuffer",
        args=OrderedDict(blockSamples="BlockSampleTensor"),
        type="BlockMaterialBuffer",
    )
    g.define(
        name="ToGeometryBuffer",
        args=OrderedDict(
            src="BlockShapeTensor",
            msk="OcclusionTensor",
            index="BlockShapeIndex",
        ),
        type="BlockGeometryBuffer",
    )
    g.define(
        name="ToMesh",
        args=OrderedDict(
            geometry="BlockGeometryBuffer",
            material="BlockMaterialBuffer",
            lighting="LightingBuffer",
            atlas="BlockAtlas",
        ),
        type="BlockMesh",
    )
    g.define(
        name="ToGlassMesh",
        args=OrderedDict(
            geometry="BlockGeometryBuffer",
            material="BlockMaterialBuffer",
            lighting="LightingBuffer",
            atlas="BlockAtlas",
        ),
        type="GlassMesh",
    )
    g.define(
        name="ToAtlas",
        args=OrderedDict(src="BlockIndex"),
        type="BlockAtlas",
    )

    # Define block art extraction routines (e.g. for debugging)
    g.define(
        name="ToBlockSample",
        args=OrderedDict(block="Block", pos="Point"),
        type="BlockSample",
    )
    g.define(
        name="ToTexture",
        args=OrderedDict(sample="BlockSample", dir="Dir"),
        type="Texture",
    )
    g.define(
        name="ToMreaTexture",
        args=OrderedDict(sample="BlockSample", dir="Dir"),
        type="Texture",
    )

    # Define flora definition routines
    g.define(
        name="ToFloraID",
        args=OrderedDict(id="U32"),
        type="FloraID",
    )
    g.define(
        name="ToFloraSample",
        args=OrderedDict(
            criteria="FloraSampleCriteria",
            geometry="FloraSampleGeometry",
            material="FloraSampleMaterial",
            transform="FloraSampleTransform",
        ),
        type="FloraSample",
    )
    g.define(
        name="ToFloraSampleCriteria",
        args=OrderedDict(growth="Str", muck="Str"),
        type="FloraSampleCriteria",
    )
    g.define(
        name="ToFloraSampleGeometry",
        args=OrderedDict(vertices="FloraVertices", indices="FloraIndices"),
        type="FloraSampleGeometry",
    )
    g.define(
        name="ToFloraSampleMaterial",
        args=OrderedDict(textures="TextureList"),
        type="FloraSampleMaterial",
    )
    g.define(
        name="ToFlora",
        args=OrderedDict(file="FloraFile"),
        type="Flora",
    )
    # Define flora indexing routines
    g.define(
        name="ToFloraIndex",
        args=OrderedDict(assignment="FloraAssignment", error="FloraID"),
        type="FloraIndex",
    )

    # Define flora meshing routines
    g.define(
        name="ToGeometryBuffer",
        args=OrderedDict(
            src="FloraTensor", growth="GrowthTensor", index="FloraIndex"
        ),
        type="FloraGeometryBuffer",
    )
    g.define(
        name="ToMesh",
        args=OrderedDict(
            geometry="FloraGeometryBuffer",
            lighting="LightingBuffer",
            atlas="FloraAtlas",
        ),
        type="FloraMesh",
    )
    g.define(
        name="ToAtlas",
        args=OrderedDict(src="FloraIndex"),
        type="FloraAtlas",
    )

    # Define routine to convert blocks and florae into icons.
    g.define(
        name="ToIcon",
        args=OrderedDict(block="Block"),
        type="Texture",
    )
    g.define(
        name="ToIcon",
        args=OrderedDict(block="Flora"),
        type="Texture",
    )
    g.define(
        name="ToIcon",
        args=OrderedDict(block="Glass"),
        type="Texture",
    )

    # Define item mesh generation routines.
    g.define(
        name="ToItemMesh",
        args=OrderedDict(block="BlockID", index="BlockIndex"),
        type="BlockItemMesh",
    )
    g.define(
        name="ToItemMesh",
        args=OrderedDict(block="FloraID", index="FloraIndex"),
        type="FloraItemMesh",
    )
    g.define(
        name="ToItemMesh",
        args=OrderedDict(glass="GlassID", index="BlockIndex"),
        type="GlassItemMesh",
    )

    # Define table generation routines.
    g.define(
        name="ToTerrainTable",
        args=OrderedDict(assignment="TerrainAssignment"),
        type="SourceFile",
    )
    g.define(
        name="ToBlockShapeTable",
        args=OrderedDict(assignment="BlockShapeAssignment"),
        type="SourceFile",
    )
    g.define(
        name="ToBlockIsomorphismTable",
        args=OrderedDict(index="BlockShapeIndex"),
        type="SourceFile",
    )

    # Block color mapping
    g.define(
        name="PrimaryColorTable",
        args=OrderedDict(colorList="ColorList"),
        type="SourceFile",
        desc="Compiles JSON file mapping primary colors to ID",
    )
