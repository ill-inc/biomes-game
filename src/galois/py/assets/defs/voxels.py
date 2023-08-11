from collections import OrderedDict

from lang import FuncGenerator, TypeGenerator


def define_types(g: TypeGenerator):
    t = g.types

    # Define voxel geometry types
    g.define(
        "Axis",
        t.Enum("x", "y", "z"),
    )
    g.define(
        "Axes",
        t.Enum("xyz", "xzy", "yxz", "yzx", "zxy", "zyx"),
    )
    g.define(
        "Dir",
        t.Enum("x_neg", "x_pos", "y_neg", "y_pos", "z_neg", "z_pos"),
    )
    g.define("Point", t.Array(t.I32(), 3))
    g.define("Point2", t.Array(t.Point(), 2))
    g.define("Point3", t.Array(t.Point(), 3))
    g.define("Point4", t.Array(t.Point(), 4))
    g.define("PointList", t.List(t.Point()))
    g.define("Box", t.Tuple(t.Point(), t.Point()))
    g.define("Box2", t.Array(t.Box(), 2))
    g.define("Box3", t.Array(t.Box(), 2))
    g.define("Box4", t.Array(t.Box(), 2))
    g.define("BoxList", t.List(t.Box()))

    # Define voxel CSG types.
    g.define("Mask", t.External("Mask"))
    g.define("Transform", t.External("Transform"))

    # Define voxel mesh type
    g.define("VoxelMesh", t.External("VoxelMesh"))


def define_funcs(g: FuncGenerator):
    # Mask routines
    g.define(
        name="EmptyMask",
        args=OrderedDict(),
        type="Mask",
    )
    g.define(
        name="BoxMask",
        args=OrderedDict(box="BoxList"),
        type="Mask",
    )
    g.define(
        name="PointMask",
        args=OrderedDict(points="PointList"),
        type="Mask",
    )
    g.define(
        name="Union",
        args=OrderedDict(lhs="Mask", rhs="Mask"),
        type="Mask",
    )
    g.define(
        name="Intersect",
        args=OrderedDict(lhs="Mask", rhs="Mask"),
        type="Mask",
    )
    g.define(
        name="Difference",
        args=OrderedDict(lhs="Mask", rhs="Mask"),
        type="Mask",
    )
    g.define(
        name="Apply",
        args=OrderedDict(mask="Mask", transform="Transform"),
        type="Mask",
    )

    # Transform routines
    g.define(
        name="Reflect",
        args=OrderedDict(x="Bool", y="Bool", z="Bool"),
        type="Transform",
    )
    g.define(
        name="Permute",
        args=OrderedDict(axes="Axes"),
        type="Transform",
    )
    g.define(
        name="Translate",
        args=OrderedDict(x="I32", y="I32", z="I32"),
        type="Transform",
    )
    g.define(
        name="Compose",
        args=OrderedDict(outer="Transform", inner="Transform"),
        type="Transform",
    )
