from collections import OrderedDict

from lang import FuncGenerator, TypeGenerator


def define_types(g: TypeGenerator):
    t = g.types

    g.define(
        "MapTexture",
        t.Tuple(
            t.List(t.External("Texture")),
            t.List(t.External("Texture")),
        ),
    )
    g.define(
        "MapTextureIndex",
        t.List(t.Tuple(t.Str(), t.MapTexture())),
    )


def define_funcs(g: FuncGenerator):
    g.define(
        name="ToMapTexture",
        args=OrderedDict(id="Block", muck="Str", color="Str"),
        type="MapTexture",
    )
