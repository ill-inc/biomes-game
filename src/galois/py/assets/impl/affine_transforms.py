import json
from enum import Enum
from typing import Dict, List, Tuple, Union

import numpy as np
import numpy.typing as npt
from impl import quaternions
from jsonschema import validate

AffineTransform = npt.NDArray


class Axis(Enum):
    X = 0
    Y = 1
    Z = 2


def from_quaternion(quat: quaternions.Quaternion):
    ret = np.identity(4)
    ret[:3, :3] = quaternions.quat_to_matrix(quat)
    return ret


def remove_translation(transform: AffineTransform):
    extracted = transform[:, :] / transform[3, 3]
    extracted[0, 3] = 0
    extracted[1, 3] = 0
    extracted[2, 3] = 0
    return extracted


def around_origin(
    transform: AffineTransform, origin: Tuple[float, float, float]
) -> AffineTransform:
    return (
        from_translation(origin)
        @ transform
        @ from_translation((-origin[0], -origin[1], -origin[2]))
    )


def from_axis_rotation(axis: Tuple[float, float, float], degrees: float):
    radians = (degrees / 360.0) * 2 * np.pi
    quat = quaternions.axis_angle(axis, radians)
    return from_quaternion(quat)


def from_translation(translation: Tuple[float, float, float]):
    ret = np.identity(4)
    ret[:3, 3] = translation
    return ret


def from_scale(scale: Tuple[float, float, float]):
    ret = np.identity(4)
    ret[0, 0] = scale[0]
    ret[1, 1] = scale[1]
    ret[2, 2] = scale[2]
    return ret


def from_list(transforms: List[AffineTransform]):
    ret = np.identity(4)
    for t in reversed(transforms):
        ret = np.matmul(t, ret)
    return ret


IDENTITY = np.identity(4)


AFFINE_TRANSFORM_JSON_SCHEMA_DEFS = {
    "vec3": {
        "type": "array",
        "items": {
            "type": "number",
        },
        "minItems": 3,
        "maxItems": 3,
    },
    "scale": {
        "description": "Scale transformation",
        "type": "object",
        "required": ["scale"],
        "additionalProperties": False,
        "properties": {"scale": {"type": "number"}},
    },
    "translate": {
        "description": "Translation transformation",
        "type": "object",
        "required": ["translate"],
        "additionalProperties": False,
        "properties": {"translate": {"$ref": "#/$defs/vec3"}},
    },
    "rotate_x": {
        "description": "Rotation around X axis transformation, in degrees.",
        "type": "object",
        "required": ["rotate_x"],
        "additionalProperties": False,
        "properties": {"rotate_x": {"type": "number"}},
    },
    "rotate_y": {
        "description": "Rotation around Y axis transformation, in degrees.",
        "type": "object",
        "required": ["rotate_y"],
        "additionalProperties": False,
        "properties": {"rotate_y": {"type": "number"}},
    },
    "rotate_z": {
        "description": "Rotation around Z axis transformation, in degrees.",
        "type": "object",
        "required": ["rotate_z"],
        "additionalProperties": False,
        "properties": {"rotate_z": {"type": "number"}},
    },
    "affine_transform": {
        "description": "Affine transformation",
        "anyOf": [
            {
                "type": "array",
                "items": {
                    "$ref": "#/$defs/affine_transform",
                },
            },
            {"$ref": "#/$defs/scale"},
            {"$ref": "#/$defs/translate"},
            {"$ref": "#/$defs/rotate_x"},
            {"$ref": "#/$defs/rotate_y"},
            {"$ref": "#/$defs/rotate_z"},
            {
                "type": "string"
            },  # Enable referencing transforms via NAMED_TRANSFORMS_JSON_SCHEMA.
        ],
    },
}

NAMED_TRANSFORMS_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": {"$ref": "#/$defs/affine_transform"},
}

NamedAffineTransforms = Dict[str, AffineTransform]


def load_named_transforms(json_str: str):
    parsed = json.loads(json_str)

    validate(
        instance=parsed,
        schema={
            "$defs": {**AFFINE_TRANSFORM_JSON_SCHEMA_DEFS},
            **NAMED_TRANSFORMS_JSON_SCHEMA,
        },
    )

    named_affine_transforms = {}
    for k, v in parsed.items():
        named_affine_transforms[k] = parse_affine_transform_from_json_dict(
            v, named_affine_transforms
        )

    return named_affine_transforms


def parse_affine_transform_from_json_dict(parsed, named_affine_transforms=None):
    if not named_affine_transforms:
        named_affine_transforms = {}

    validate(
        instance=parsed,
        schema={
            "$defs": {**AFFINE_TRANSFORM_JSON_SCHEMA_DEFS},
            **{"$ref": "#/$defs/affine_transform"},
        },
    )

    if isinstance(parsed, list):
        return from_list(
            [
                parse_affine_transform_from_json_dict(
                    x, named_affine_transforms
                )
                for x in parsed
            ]
        )
    elif isinstance(parsed, str):
        return named_affine_transforms[parsed]
    else:
        if "scale" in parsed:
            scale = parsed["scale"]
            return from_scale([scale, scale, scale])
        elif "translate" in parsed:
            translate = parsed["translate"]
            return from_translation(translate)
        elif "rotate_x" in parsed:
            angle = parsed["rotate_x"]
            return from_axis_rotation([1, 0, 0], angle)
        elif "rotate_y" in parsed:
            angle = parsed["rotate_y"]
            return from_axis_rotation([0, 1, 0], angle)
        elif "rotate_z" in parsed:
            angle = parsed["rotate_z"]
            return from_axis_rotation([0, 0, 1], angle)
        else:
            raise ValueError(
                f"Unrecognized transformation: {json.dumps(parsed)}"
            )
