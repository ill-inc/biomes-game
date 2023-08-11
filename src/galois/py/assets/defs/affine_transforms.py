from collections import OrderedDict

from lang import FuncGenerator, TypeGenerator


def define_types(g: TypeGenerator):
    t = g.types

    g.define(
        "AffineTransform",
        t.External("AffineTransform"),
        "An affine transform that could be represented by a 4x4 Matrix.",
    )
    g.define(
        "AffineTransformList",
        t.List(t.AffineTransform()),
        "A list of affine transforms.",
    )
    g.define(
        "Quaternion",
        t.Tuple(t.F32(), t.F32(), t.F32(), t.F32()),
    )
    g.define("NamedAffineTransforms", t.External("NamedAffineTransforms"))


def define_funcs(g: FuncGenerator):
    g.define(
        "AffineFromQuaternion",
        args=OrderedDict(
            quaternion="Quaternion",
        ),
        type="AffineTransform",
        desc="Returns an affine transform corresponding to a unit quaternion rotation.",
    )
    g.define(
        "AffineFromAxisRotation",
        args=OrderedDict(
            axis="Vec3F32",
            degrees="F32",
        ),
        type="AffineTransform",
        desc="Returns an affine transform corresponding to a unit quaternion rotation.",
    )

    g.define(
        "AffineFromTranslation",
        args=OrderedDict(
            translation="Vec3F32",
        ),
        type="AffineTransform",
        desc="Returns an affine transform corresponding to a translation by the provided vector.",
    )

    g.define(
        "AffineFromScale",
        args=OrderedDict(
            scale="Vec3F32",
        ),
        type="AffineTransform",
        desc="Returns an affine transform corresponding to a scale vector.",
    )

    g.define(
        "AffineFromList",
        args=OrderedDict(
            transforms="AffineTransformList",
        ),
        type="AffineTransform",
        desc="Returns an affine transform by concatenating together a list of affine transforms. They apply in bottom-up order, so the first affine will apply on top of all the ones below it.",
    )

    g.define(
        "LoadNamedAffineTransformsFromJSON",
        args=OrderedDict(
            filePath="Str",
        ),
        type="NamedAffineTransforms",
        desc="Parses a JSON file containing an object mapping string names to affine transforms.",
    )
