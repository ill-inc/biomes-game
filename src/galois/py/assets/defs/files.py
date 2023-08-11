from collections import OrderedDict

from lang import FuncGenerator, TypeGenerator


def define_types(g: TypeGenerator):
    t = g.types

    g.define("BinaryFile", t.Str())
    g.define("BlockFile", t.Str())
    g.define("FloraFile", t.Str())
    g.define("GLTFFile", t.Str())
    g.define("ImageFile", t.Str())
    g.define("PNGFile", t.Str())
    g.define("SourceFile", t.External("SourceFile"))
    g.define("VoxFile", t.Str())
    g.define("Blob", t.Str())


def define_funcs(g: FuncGenerator):
    g.define(
        name="ToBinary",
        args=OrderedDict(file="BinaryFile"),
        type="Binary",
    )
