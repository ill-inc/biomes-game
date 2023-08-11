from collections import OrderedDict

from lang import FuncGenerator, TypeGenerator


def define_types(g: TypeGenerator):
    t = g.types

    # Define terrain types.
    g.define("WaterValue", t.U8())
    g.define("WaterTensor", t.External("WaterTensor"))
    g.define("WaterMesh", t.External("WaterMesh"))


def define_funcs(g: FuncGenerator):
    # Define water CSG routines
    g.define(
        name="EmptyWaterTensor",
        args=OrderedDict(),
        type="WaterTensor",
    )
    g.define(
        name="Write",
        args=OrderedDict(src="WaterTensor", at="Mask", val="WaterValue"),
        type="WaterTensor",
    )
    g.define(
        name="Merge",
        args=OrderedDict(lhs="WaterTensor", rhs="WaterTensor"),
        type="WaterTensor",
    )
    g.define(
        name="Clear",
        args=OrderedDict(src="WaterTensor", at="Mask"),
        type="WaterTensor",
    )
    g.define(
        name="Slice",
        args=OrderedDict(src="WaterTensor", at="Mask"),
        type="WaterTensor",
    )
    g.define(
        name="Apply",
        args=OrderedDict(src="WaterTensor", by="Transform"),
        type="WaterTensor",
    )

    # Define water tensor routines
    g.define(
        name="ToSurfaceTensor",
        args=OrderedDict(src="WaterTensor"),
        type="WaterTensor",
    )
    g.define(
        name="ToLightingBuffer",
        args=OrderedDict(surface="WaterTensor", shapes="BlockShapeTensor"),
        type="LightingBuffer",
    )

    # Define water meshing routines
    g.define(
        name="ToMesh",
        args=OrderedDict(surface="WaterTensor", lighting="LightingBuffer"),
        type="WaterMesh",
    )
