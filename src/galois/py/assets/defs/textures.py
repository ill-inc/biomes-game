from collections import OrderedDict

from lang import FuncGenerator, TypeGenerator


def define_types(g: TypeGenerator):
    t = g.types

    # Define image and texture types
    g.define("Texture", t.External("Texture"))
    g.define("TextureList", t.List(t.Texture()))
    g.define("TextureAtlas", t.External("TextureAtlas"))
    g.define("TextureSize", t.Array(t.U32(), 2))
    g.define("Color", t.Union(t.Array(t.U8(), 3), t.Array(t.U8(), 4)))

    # Define file types
    g.define("PNG", t.External("PNG"))
    g.define("PNGList", t.List(t.PNG()))


def define_funcs(g: FuncGenerator):
    # Image creation routines
    g.define(
        name="ImageRGB",
        args=OrderedDict(file="PNGFile"),
        type="Texture",
    )
    g.define(
        name="ImageRGBA",
        args=OrderedDict(file="PNGFile"),
        type="Texture",
    )
    g.define(
        name="ToAtlas",
        args=OrderedDict(textures="TextureList"),
        type="TextureAtlas",
    )
    g.define(
        name="FlattenAtlas",
        args=OrderedDict(textures="TextureAtlas"),
        type="Texture",
    )

    # Image transformations
    g.define(
        name="FlipVertical",
        args=OrderedDict(pixels="Texture"),
        type="Texture",
    )
    g.define(
        name="FlipHorizontal",
        args=OrderedDict(pixels="Texture"),
        type="Texture",
    )
    g.define(
        name="PadToSize",
        args=OrderedDict(pixels="Texture", size="TextureSize", color="Color"),
        type="Texture",
    )

    # Color manipulation
    g.define(
        name="AdjustSaturation",
        args=OrderedDict(pixels="Texture", hue="F32"),
        type="Texture",
    )
    g.define(
        name="AdjustContrast",
        args=OrderedDict(pixels="Texture", hue="F32"),
        type="Texture",
    )
    g.define(
        name="AdjustBrightness",
        args=OrderedDict(pixels="Texture", hue="F32"),
        type="Texture",
    )
    g.define(
        name="HueShift",
        args=OrderedDict(pixels="Texture", hue="F32"),
        type="Texture",
    )

    # Image file format conversions
    g.define(
        name="ToImageRGB",
        args=OrderedDict(data="PNG"),
        type="Texture",
    )
    g.define(
        name="ToImageRGBA",
        args=OrderedDict(data="PNG"),
        type="Texture",
    )
    g.define(
        name="ToPNG",
        args=OrderedDict(data="Str"),
        type="PNG",
    )
    g.define(
        name="ToPNG",
        args=OrderedDict(pixels="Texture"),
        type="PNG",
    )
