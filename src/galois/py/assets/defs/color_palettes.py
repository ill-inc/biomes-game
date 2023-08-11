from collections import OrderedDict

from lang import FuncGenerator, TypeGenerator


def define_types(g: TypeGenerator):
    t = g.types

    g.define("ColorRGB", t.Tuple(t.U8(), t.U8(), t.U8()))
    g.define("ColorPalette", t.External("ColorPalette"))
    g.define("ColorPaletteList", t.External("ColorPaletteList"))
    g.define(
        "ColorPaletteListList",
        t.List(t.Tuple(t.Str(), t.ColorPaletteList())),
    )


def define_funcs(g: FuncGenerator):
    g.define(
        name="ColorPalettesDefinitions",
        args=OrderedDict(
            colorPaletteList="ColorPaletteListList",
        ),
        type="SourceFile",
        desc="Compiles JSON file defining color palettes.",
    )

    g.define(
        name="GetColorEntry",
        args=OrderedDict(
            id="Str",
            colorPaletteEntries="ColorPaletteList",
        ),
        type="ColorPalette",
        desc="Loads the specified color palette ID from a color palette file.",
    )

    g.define(
        name="LoadColorPaletteListFromJSONFile",
        args=OrderedDict(
            expectedIds="StrList",
            filePath="Str",
        ),
        type="ColorPaletteList",
        desc="Reads and parses color palette entries from a json file.",
    )
