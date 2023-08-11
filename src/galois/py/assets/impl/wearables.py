import json
import os
import re
from multiprocessing.sharedctypes import Value
from pathlib import Path
from typing import Dict, List, Tuple, Union

from impl import poses
from impl import types as t
from impl import vox, vox_parsing

CURRENT_SCRIPT_DIR = Path(os.path.dirname(os.path.realpath(__file__)))

WearableSlotSchema = List[str]
Wearable = Tuple[str, vox.PosedVoxJointMap]
WearableDefinitionList = List[Tuple[str, str]]


def order_pose_vox_joint_maps(
    schema: WearableSlotSchema, wearables: List[Wearable]
):
    ordered_posed_vox_joint_maps: List[vox.PosedVoxJointMap] = []

    # Check that we have at most one wearable for each wearable
    # slot.
    for slot in schema:
        slot_found = False
        for wearable_slot, posed_vox_joint_map in wearables:
            if wearable_slot != slot:
                continue
            if slot_found:
                raise ValueError(
                    f"Wearable list contains multiple entries for slot '{slot}'."
                )
            slot_found = True
            ordered_posed_vox_joint_maps.append(posed_vox_joint_map)

    return ordered_posed_vox_joint_maps


# Given a wearable schema and a set of wearables, accumulate their voxels over
# each other (in the order specified by the schema), per joint, to produce
# final PosedVoxJointMap representing the combined wearables.
def to_posed_vox_joint_map_from_wearables(
    schema: WearableSlotSchema, wearables: List[Wearable]
) -> vox.PosedVoxJointMap:
    if len(wearables) == 0:
        raise ValueError("No wearables specified.")

    ordered_pose_vox_joint_maps = order_pose_vox_joint_maps(schema, wearables)
    return vox.accumulate_posed_vox_joint_maps(ordered_pose_vox_joint_maps)


SPLIT_CAMEL_CASE_RE = re.compile(r"(?<!^)(?=[A-Z])")


def to_snake_case(s: str) -> str:
    return SPLIT_CAMEL_CASE_RE.sub("_", s).lower()


def generate_wearables_definitions_json(
    wearable_slot_schema: WearableSlotSchema,
    wearable_definition_list: WearableDefinitionList,
    character_skeleton: poses.Skeleton,
):
    return t.SourceFile(
        extension="json",
        content=json.dumps(
            {
                "wearable_slots": {
                    k: i for i, k in enumerate(wearable_slot_schema)
                },
                "wearable_definitions": {
                    x[0]: {"name": x[0], "slot": x[1]}
                    for x in wearable_definition_list
                },
            },
            indent=2,
        ),
    )
