from collections import OrderedDict

from lang import FuncGenerator, TypeGenerator


def define_types(g: TypeGenerator):
    t = g.types

    g.define("Binary", t.External("Binary"))
    g.define("PairU16", t.Tuple(t.U16(), t.U16()))
    g.define("StrList", t.List(t.Str()))
    g.define("TypeScriptFile", t.External("TypeScriptFile"))
    g.define("Vec3F32", t.Tuple(t.F32(), t.F32(), t.F32()))


def define_funcs(g: FuncGenerator):
    pass
