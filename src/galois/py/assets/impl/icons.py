from dataclasses import dataclass
from typing import Tuple

from jsonschema import validate

from impl import textures
from impl import types as t
from impl import vox, vox_parsing


@dataclass
class IconSettings:
    camera_dir: Tuple[float, float, float]
    lighting_dir: Tuple[float, float, float]
    brightness: float
    contrast: float
    saturation: float


DEFAULT_ICON_SETTINGS = IconSettings(
    camera_dir=[1, 1, -1],
    lighting_dir=[7, 5, -11],
    brightness=1.4,
    contrast=1.0,
    saturation=1.2,
)

ICON_SETTINGS_JSON_SCHEMA_DEFS = {
    "vec3": {
        "type": "array",
        "items": {
            "type": "number",
        },
        "minItems": 3,
        "maxItems": 3,
    },
    "icon_settings": {
        "description": "Properties that affect the appearance of the generated icon.",
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "camera_dir": {"$ref": "#/$defs/vec3"},
            "lighting_dir": {"$ref": "#/$defs/vec3"},
            "brightness": {"type": "number"},
            "contrast": {"type": "number"},
            "saturation": {"type": "number"},
        },
    },
}


def parse_icon_settings_from_json_dict(parsed):
    validate(
        instance=parsed,
        schema={
            "$defs": {**ICON_SETTINGS_JSON_SCHEMA_DEFS},
            **{"$ref": "#/$defs/icon_settings"},
        },
    )

    def parsed_or_default(key: str):
        return (
            parsed[key]
            if key in parsed
            else DEFAULT_ICON_SETTINGS.__dict__[key]
        )

    return IconSettings(
        camera_dir=parsed_or_default("camera_dir"),
        lighting_dir=parsed_or_default("lighting_dir"),
        brightness=parsed_or_default("brightness"),
        contrast=parsed_or_default("contrast"),
        saturation=parsed_or_default("saturation"),
    )


def render_vox_map_with_settings(
    vox_map: vox.VoxMap,
    output_size: Tuple[int, int],
    icon_settings: IconSettings,
):
    result = t.Texture(
        data=vox.render_vox_map(
            vox_map,
            output_size,
            icon_settings.camera_dir,
            icon_settings.lighting_dir,
        )
    )
    result = textures.adjust_brightness(result, icon_settings.brightness)
    result = textures.adjust_contrast(result, icon_settings.contrast)
    result = textures.adjust_saturation(result, icon_settings.saturation)
    return result
