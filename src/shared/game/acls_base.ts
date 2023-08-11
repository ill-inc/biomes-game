// Base ACL functions to avoid circular deps

import type { AclAction, ReadonlyAcl } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";

export type ReadonlyIndexedAcl = ReadonlyAcl & {
  id?: BiomesId;
};

export type AclPreset =
  | "Can Visit"
  | "Can Build"
  | "Creator"
  | "Admin"
  | "Team Actions";
export const aclPresets = new Map<AclPreset, AclAction[]>([
  ["Can Visit", ["apply_buffs", "warp_from", "placeEphemeral"]],
  [
    "Can Build",
    [
      "shape",
      "place",
      "destroy",
      "interact",
      "placeCampsite",
      "dump",
      "tillSoil",
      "plantSeed",
      "placeRobot",
    ],
  ],
  [
    "Team Actions",
    [
      "shape",
      "place",
      "destroy",
      "interact",
      "placeCampsite",
      "dump",
      "tillSoil",
      "plantSeed",
    ],
  ],
  ["Creator", ["createGroup"]],
  [
    "Admin",
    [
      "shape",
      "place",
      "destroy",
      "interact",
      "createGroup",
      "administrate",
      "dump",
      "placeCampsite",
      "tillSoil",
      "plantSeed",
      "placeRobot",
    ],
  ],
]);

export function getAclPreset(preset: AclPreset): AclAction[] {
  return aclPresets.get(preset) || [];
}

export function inheritFromLand(acl: ReadonlyIndexedAcl): ReadonlyIndexedAcl {
  return {
    ...acl,
    everyone: new Set([...acl.everyone, ...getAclPreset("Can Visit")]),
  };
}

export const DEFAULT_MUCK_ACL: ReadonlyAcl = {
  everyone: new Set([
    ...getAclPreset("Can Build"),
    ...getAclPreset("Can Visit"),
  ]),
  entities: new Map(),
  teams: new Map(),
  roles: new Map([["groundskeeper", new Set(getAclPreset("Admin"))]]),
  creator: undefined,
  creatorTeam: undefined,
};

export const DEFAULT_BUILD_ACTIONS = new Set([
  ...getAclPreset("Can Build"),
  ...getAclPreset("Can Visit"),
  ...getAclPreset("Creator"),
]);

export const DEFAULT_TEAM_ACTIONS = new Set([
  ...getAclPreset("Team Actions"),
  ...getAclPreset("Can Visit"),
]);
