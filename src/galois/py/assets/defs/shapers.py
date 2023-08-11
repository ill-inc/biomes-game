from collections import OrderedDict

from lang import FuncGenerator, TypeGenerator


def define_types(g: TypeGenerator):
    t = g.types

    g.define(
        "Shaper",
        t.External("Shaper"),
    )
    g.define(
        "ShapeList",
        t.List(t.U32()),
    )
    g.define(
        "ShaperIndex",
        t.List(t.Tuple(t.Str(), t.Shaper())),
    )


def define_funcs(g: FuncGenerator):
    # TODO: Add more complex shaper definitions here (e.g. shapes with corners).
    g.define(
        name="ToShaper",
        args=OrderedDict(
            index="BlockShapeIndex",
            shape="U32",
            overrides="ShapeList",
        ),
        type="Shaper",
    )

    g.define(
        name="ToShaper",
        args=OrderedDict(
            index="BlockShapeIndex",
            shape="U32",
            overrides="ShapeList",
            transform="Transform",
        ),
        type="Shaper",
    )

    g.define(
        name="ToShaperTable",
        args=OrderedDict(
            index="ShaperIndex",
        ),
        type="SourceFile",
    )
