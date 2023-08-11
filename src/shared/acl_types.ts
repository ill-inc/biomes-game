import { keys } from "lodash";
import { z } from "zod";

export const zAclAction = z.enum([
  "shape",
  "place",
  "destroy",
  "interact",
  "administrate",
  "createGroup",
  "dump",
  "tillSoil",
  "plantSeed",
  "pvp",
  "warp_from",
  "apply_buffs",
  "placeRobot",
  "placeCampsite",
  "placeEphemeral",
  "demuckerWand",
]);

export type AclAction = z.infer<typeof zAclAction>;

export const ALL_ACTIONS = new Set<AclAction>(
  keys(zAclAction.enum) as AclAction[]
);

export function isAclAction(value: unknown): value is AclAction {
  return ALL_ACTIONS.has(value as AclAction);
}

export const ALL_SPECIAL_ROLES = [
  "employee",
  // Can visit biomes.gg/admin
  "admin",
  // Can see client advanced options.
  "advancedOptions",
  // Can delete groups.
  "deleteGroup",
  // Can highlight groups.
  "highlightGroup",
  // Can unplace groups.
  "unplaceGroup", // deprecated
  // Can repair groups.
  "repairGroup",
  // Can see gremlins.
  "seeGremlins",
  // Can see NPCs.
  "seeNpcs",
  // Can perform /admin bless.
  "bless",
  // Can perform /admin give.
  "give",
  // Can fly.
  "flying",
  // Can use the internal sync mode.
  "internalSync",
  // Can export from sync servers.
  "export",
  // Can modify national parks.
  "groundskeeper",
  // Can clone groups.
  "clone",
  // Can make applies against the world.
  "apply",
  // Has a two way inbox
  "twoWayInbox",
  // Sees all biscuits
  "baker",
  // Can access admin commands on farming plants in-world
  "farmingAdmin",
  // Can do OOB fetches without CORS
  "oobNoCors",
  // Can use noclip
  "noClip",
] as const;

export const zSpecialRoles = z.enum([
  "admin",
  "advancedOptions",
  ...ALL_SPECIAL_ROLES,
]);

export type SpecialRoles = z.infer<typeof zSpecialRoles>;
