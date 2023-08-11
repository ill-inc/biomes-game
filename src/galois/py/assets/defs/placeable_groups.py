from collections import OrderedDict

from lang import FuncGenerator, TypeGenerator


def define_types(g: TypeGenerator):
    t = g.types

    g.define("Placeable", t.External("Placeable"))
    g.define("Placeables", t.List(t.Placeable()))
    g.define("Orientation", t.Tuple(t.U32(), t.U32()))
    g.define("BlueprintGroupDefinition", t.External("BlueprintGroupDefinition"))
    g.define(
        "BlueprintGroupDefinitions",
        t.List(t.BlueprintGroupDefinition()),
    )


def define_funcs(g: FuncGenerator):
    g.define(
        name="ToPlaceable",
        args=OrderedDict(id="U32", position="Point", orientation="Orientation"),
        type="Placeable",
    )

    g.define(
        name="ToBlueprintGroupDefinition",
        args=OrderedDict(
            id="U32",
            name="Str",
            tensor="GroupTensor",
        ),
        type="BlueprintGroupDefinition",
    )

    g.define(
        name="ToBlueprintGroupDefinitions",
        args=OrderedDict(definitions="BlueprintGroupDefinitions"),
        type="SourceFile",
        desc="Writes blueprint definitions to a JSON source file",
    )
