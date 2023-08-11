import json
from typing import List, Tuple

from jsonschema import validate

ColorRGB = Tuple[int, int, int]
ColorPalette = Tuple[str, ColorRGB, List[ColorRGB]]
ColorPaletteList = List[ColorPalette]

from impl import types as t


def load_expected_color_entries_from_json(
    expected_ids: List[str], json_str: str
) -> ColorPaletteList:
    # Loads the color palette entries and additionally checks that their IDs
    # are all valid.
    parsed = load_color_entries_from_json(json_str)
    for x in parsed:
        if x[0] not in expected_ids:
            raise ValueError(f"Color entry {x[0]} is unexpected.")
    parsed_ids = [x[0] for x in parsed]
    for x in expected_ids:
        if x not in parsed_ids:
            raise ValueError(
                f"Expected color entry {x} not found in color entry list."
            )
    return parsed


def parse_hex_color(h):
    if len(h) != 7:
        raise ValueError(
            f"Expected only 7 characters ('#RRGGBB') to appear in hex color. Got '{h}'."
        )
    if h[0] != "#":
        raise ValueError(
            f"Expected first character of color to be '#'. Got: '{h[0]}' (in '{h}')"
        )

    r = int(f"0x{h[1:3]}", 0)
    g = int(f"0x{h[3:5]}", 0)
    b = int(f"0x{h[5:7]}", 0)

    return [r, g, b]


def load_color_entries_from_json(json_str: str) -> List[ColorPalette]:
    parsed = json.loads(json_str)

    COLOR_TUPLE = {
        "anyOf": [
            {
                "type": "array",
                "maxItems": 3,
                "minItems": 3,
                "items": {"type": "number", "minimum": 0, "maximum": 255},
            },
            {
                "type": "string",
            },
        ]
    }
    schema = {
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "id": {"type": "string"},
                "iconColor": COLOR_TUPLE,
                "colors": {
                    "type": "array",
                    "items": COLOR_TUPLE,
                },
            },
        },
    }
    validate(instance=parsed, schema=schema)

    first_palette_length = len(parsed[0]["colors"])
    for x in parsed:
        if "iconColor" not in x:
            x["iconColor"] = x["colors"][0]

        if len(x["colors"]) != first_palette_length:
            raise ValueError(
                "All color entries should specify the same number of palette colors."
            )
        for i, c in enumerate(x["colors"]):
            if isinstance(c, str):
                x["colors"][i] = parse_hex_color(c)
        if isinstance(x["iconColor"], str):
            x["iconColor"] = parse_hex_color(x["iconColor"])

    # Convert to color palette list.
    return [[x["id"], x["iconColor"], x["colors"]] for x in parsed]


def get_color_entry(
    id: str, named_color_palette_list: ColorPaletteList
) -> ColorPalette:
    entry = [x for x in named_color_palette_list if x[0] == id]
    if len(entry) != 1:
        raise ValueError("Expected exactly 1 entry.")
    return entry[0]


def generate_color_palette_definitions_json(
    color_palettes_list: Tuple[str, ColorPaletteList],
):
    def to_palette_dict(palette_list: List[ColorPalette]):
        return {
            x[0]: {
                "iconColor": list(x[1]),
                "colors": [list(c) for c in x[2]],
            }
            for x in palette_list
        }

    return t.SourceFile(
        extension="json",
        content=json.dumps(
            {k: to_palette_dict(v) for [k, v] in color_palettes_list},
            indent=2,
        ),
    )
