from collections import OrderedDict
from typing import Any, Dict

from lang import FuncGenerator, TypeGenerator


def define_types(g: TypeGenerator):
    t = g.types

    # Define block types.
    # TODO(taylor): Replace this with assertions or a JSON string...
    g.define(
        "ItemAssignment",
        t.List(
            t.Dict(
                key=t.Str(),
                type=t.Str(),
                icon=t.Str(),
                blockId=t.Optional(t.External("BlockID")),
            )
        ),
    )
    g.define("ItemTable", t.External("ItemTable"))


def define_funcs(g: FuncGenerator):
    g.define(
        name="ToItemTable",
        args=OrderedDict(id="ItemAssignment"),
        type="ItemTable",
    )
