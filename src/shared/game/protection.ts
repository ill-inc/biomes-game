import type {
  ProtectionAcls,
  ProtectionProjection,
} from "@/shared/bikkie/schema/types";
import { ProjectsProtection } from "@/shared/ecs/gen/components";
import type { ReadonlyEntityWith } from "@/shared/ecs/gen/entities";
import type { Acl } from "@/shared/ecs/gen/types";
import { createComponentSelector } from "@/shared/ecs/selectors/helper";
import type { Table } from "@/shared/ecs/table";
import type { ReadonlyIndexedAcl } from "@/shared/game/acls_base";
import {
  DEFAULT_BUILD_ACTIONS,
  DEFAULT_TEAM_ACTIONS,
} from "@/shared/game/acls_base";
import { INVALID_BIOMES_ID, type BiomesId } from "@/shared/ids";
import type { ReadonlyAABB, ReadonlyVec3 } from "@/shared/math/types";

const protectionComponents = [
  "protection",
  "position",
  "size",
  "acl_component",
] as const;
export type ProtectionEntity = ReadonlyEntityWith<
  (typeof protectionComponents)[number]
>;

export const ProtectionSelector = createComponentSelector(
  "protection",
  ...protectionComponents
);

export function createProtectionIndexConfig() {
  return { ...ProtectionSelector.createIndexFor.spatial() };
}

export type ProtectionMetaIndex = ReturnType<
  typeof createProtectionIndexConfig
>;
export type ProtectionTable = Table<ProtectionMetaIndex>;

function toIndexedAcl(entity: ProtectionEntity) {
  return { ...entity.acl_component.acl, id: entity.id };
}

export function protectionAclsForAabb(
  areaOfEffect: ReadonlyAABB,
  table: ProtectionTable
): ReadonlyIndexedAcl[] {
  return Array.from(
    table.scan(ProtectionSelector.query.spatial.inAabb(areaOfEffect)),
    toIndexedAcl
  );
}

export function protectionAclsForPoint(
  point: ReadonlyVec3,
  table: ProtectionTable
): ReadonlyIndexedAcl[] {
  return Array.from(
    table.scan(ProtectionSelector.query.spatial.atPoint(point)),
    toIndexedAcl
  );
}

function makeEcsAcls(
  creatorId: BiomesId | undefined,
  acls: ProtectionAcls
): Acl {
  return {
    entities: new Map(),
    everyone: acls.everyone ?? new Set(),
    roles: acls.roles ?? new Map(),
    teams: new Map(),
    // Note, if we later gain a creator we expect them to gain all actions.
    creator: [creatorId ?? INVALID_BIOMES_ID, DEFAULT_BUILD_ACTIONS],
    // In a similar fashion, we extend by-default to the team.
    creatorTeam: [INVALID_BIOMES_ID, DEFAULT_TEAM_ACTIONS],
  };
}

export function projectsProtectionComponentsFromAttribute(
  projectsProtection: ProtectionProjection,
  creatorId: BiomesId | undefined,
  timestamp?: number
) {
  if (!projectsProtection.protection && !projectsProtection.restoration) {
    return undefined;
  }

  return {
    projects_protection: ProjectsProtection.create({
      size: projectsProtection.size,
      snapToGrid: projectsProtection.snapToGrid,
      timestamp,
      ...(projectsProtection.protection
        ? {
            protection: {
              acl: makeEcsAcls(creatorId, projectsProtection.protection.acls),
            },
          }
        : {}),
      ...(projectsProtection.restoration
        ? {
            restoration: {
              acl: makeEcsAcls(creatorId, projectsProtection.restoration.acls),
              restore_delay_s:
                projectsProtection.restoration.restoreDelaySeconds,
            },
          }
        : {}),
    }),
  };
}
