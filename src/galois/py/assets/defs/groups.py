from collections import OrderedDict

from lang import FuncGenerator, TypeGenerator


def define_types(g: TypeGenerator):
    t = g.types

    g.define("GroupTensor", t.External("GroupTensor"))
    g.define("GroupIndex", t.External("GroupIndex"))
    g.define("GroupMesh", t.External("GroupMesh"))
    g.define("WireframeMesh", t.External("WireframeMesh"))


def define_funcs(g: FuncGenerator):
    # Define terrain ID registration routines
    g.define(
        name="LoadGroupTensor",
        args=OrderedDict(
            blob="Str",
        ),
        type="GroupTensor",
    )
    g.define(
        name="ToGroupTensor",
        args=OrderedDict(
            terrain="TerrainTensor",
            isomorphisms="BlockShapeTensor",
            dye="DyeTensor",
            moisture="MoistureTensor",
            growth="GrowthTensor",
        ),
        type="GroupTensor",
    )
    g.define(
        name="ToGroupIndex",
        args=OrderedDict(
            blocks="BlockIndex",
            shapes="BlockShapeIndex",
            florae="FloraIndex",
            glasses="BlockIndex",
        ),
        type="GroupIndex",
    )
    g.define(
        name="ToMesh",
        args=OrderedDict(
            blocks="GroupTensor",
            shapes="GroupIndex",
        ),
        type="GroupMesh",
    )
    g.define(
        name="ToWireframeMesh",
        args=OrderedDict(
            blocks="GroupTensor",
            shapes="BlockShapeIndex",
        ),
        type="WireframeMesh",
    )
