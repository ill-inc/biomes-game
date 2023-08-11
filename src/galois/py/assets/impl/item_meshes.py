import json
from dataclasses import dataclass
from typing import Optional, Union

from jsonschema import validate

from impl import affine_transforms, icons
from impl import types as t


@dataclass
class ItemMeshProperties:
    transform: Optional[affine_transforms.AffineTransform]
    attachment_transform: Optional[affine_transforms.AffineTransform]
    icon_settings: Optional[icons.IconSettings]


DEFAULT_PROPERTIES = ItemMeshProperties(
    transform=affine_transforms.IDENTITY,
    attachment_transform=affine_transforms.IDENTITY,
    icon_settings=icons.DEFAULT_ICON_SETTINGS,
)


def load_properties_or_use_default(
    json_str: str,
    named_affine_transforms: affine_transforms.NamedAffineTransforms,
):
    parsed = json.loads(json_str)

    schema = {
        "$defs": {
            **affine_transforms.AFFINE_TRANSFORM_JSON_SCHEMA_DEFS,
            **icons.ICON_SETTINGS_JSON_SCHEMA_DEFS,
        },
        **{
            "type": "object",
            "properties": {
                "transform": {"$ref": "#/$defs/affine_transform"},
                "attachment_transform": {"$ref": "#/$defs/affine_transform"},
                "icon_settings": {"$ref": "#/$defs/icon_settings"},
            },
            "additionalProperties": False,
        },
    }

    validate(instance=parsed, schema=schema)

    return ItemMeshProperties(
        transform=affine_transforms.parse_affine_transform_from_json_dict(
            parsed["transform"],
            named_affine_transforms=named_affine_transforms,
        )
        if "transform" in parsed
        else DEFAULT_PROPERTIES.transform,
        attachment_transform=affine_transforms.parse_affine_transform_from_json_dict(
            parsed["attachment_transform"],
            named_affine_transforms=named_affine_transforms,
        )
        if "attachment_transform" in parsed
        else DEFAULT_PROPERTIES.attachment_transform,
        icon_settings=icons.parse_icon_settings_from_json_dict(
            parsed["icon_settings"]
        )
        if "icon_settings" in parsed
        else DEFAULT_PROPERTIES.icon_settings,
    )


def to_item_mesh(
    gltf: Union[t.GLTF, t.GLB],
    hand_attachment_transform: affine_transforms.AffineTransform,
):
    return t.GLTFItemMesh(
        gltf=gltf,
        hand_attachment_transform=hand_attachment_transform.transpose()
        .flatten()
        .tolist(),
    )
