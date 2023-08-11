from collections import OrderedDict

from lang import FuncGenerator, TypeGenerator


def define_types(g: TypeGenerator):
    t = g.types

    g.define(
        "WEBM",
        t.External("WEBM"),
        "WEBM audio data.",
    )


def define_funcs(g: FuncGenerator):

    g.define(
        name="LoadWEBM",
        args=OrderedDict(path="Str"),
        type="WEBM",
        desc="Loads a WEBM file from the given path",
    )
