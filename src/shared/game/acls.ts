import { isAclAction, type SpecialRoles } from "@/shared/acl_types";
import { terrainLifetime } from "@/shared/asset_defs/quirk_helpers";
import type { ReadonlyEntityWith } from "@/shared/ecs/gen/entities";
import { TerrainShardSelector } from "@/shared/ecs/gen/selectors";
import type {
  AclAction,
  Item,
  ReadonlyAcl,
  ReadonlyAclDomain,
  ReadonlyVec3i,
  ShardId,
} from "@/shared/ecs/gen/types";
import type { Table } from "@/shared/ecs/table";
import type { ReadonlyIndexedAcl } from "@/shared/game/acls_base";
import { DEFAULT_MUCK_ACL, inheritFromLand } from "@/shared/game/acls_base";
import { getAabbForEntity } from "@/shared/game/entity_sizes";
import { ALWAYS_ALLOWED_ITEM_ACTIONS } from "@/shared/game/players";
import {
  createProtectionIndexConfig,
  ProtectionSelector,
} from "@/shared/game/protection";
import * as Shards from "@/shared/game/shard";
import { shardsForAABB, voxelShard } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import {
  aabbIterator,
  containsAABB,
  floor,
  integerAABB,
} from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { DefaultMap } from "@/shared/util/collections";
import { ok } from "assert";
import { first, isEqual } from "lodash";

export function createAclsIndexConfig() {
  return {
    ...TerrainShardSelector.createIndexFor.spatial(),
    ...createProtectionIndexConfig(),
  };
}
export type AclsMetaIndex = ReturnType<typeof createAclsIndexConfig>;
export type AclsTable = Table<AclsMetaIndex>;

export function actionAllowed(
  acls: ReadonlyAcl[],
  action: AclAction,
  { userId, teamId }: { userId: BiomesId; teamId?: BiomesId },
  roleCheck: (role: SpecialRoles) => boolean
): boolean {
  for (const acl of acls) {
    // Check if publicly available
    if (acl.everyone.has(action)) {
      continue;
    }

    // Check if there's an owner
    if (acl.creator?.[0] === userId && acl.creator[1].has(action)) {
      continue;
    }

    // Check for explicit entity
    if (acl.entities.get(userId)?.has(action)) {
      continue;
    }

    // Check for explicit team
    if (teamId) {
      if (acl.creatorTeam?.[0] === teamId && acl.creatorTeam[1].has(action)) {
        continue;
      }
      if (acl.teams.get(teamId)?.has(action)) {
        continue;
      }
    }

    let permissionFound = false;
    for (const [role, actions] of acl.roles) {
      if (actions.has(action) && roleCheck(role)) {
        permissionFound = true;
        break;
      }
    }
    if (permissionFound) {
      continue;
    }

    return false;
  }

  return true;
}

export function aclsForDomain(
  domain: ReadonlyAclDomain,
  table: AclsTable
): ReadonlyIndexedAcl[] {
  return aclsForEntities(aclEntitiesForDomain(domain, table));
}

// Once this object is created from the table, all subsequent ACL processing
// on it can be done independent of the table.
export interface AclEntities {
  // The domain these entities were queried from.
  domain: ReadonlyAclDomain;
  protections: ReadonlyEntityWith<
    "acl_component" | "position" | "size" | "protection"
  >[];
}

// Narrows the set of entities relevant to ACLs to a subdomain of the original
// domain.
export function narrowAclEntities(
  inEntities: AclEntities,
  points: ReadonlyVec3[]
): AclEntities {
  ok(domainContainsPoints(inEntities.domain, points));
  const newDomain: ReadonlyAclDomain = { kind: "points", points };

  return {
    domain: newDomain,
    protections: inEntities.protections.filter((protection) => {
      const aabb = getAabbForEntity(protection);
      return !!aabb && points.some((p) => containsAABB(aabb, p));
    }),
  };
}

function domainContainsPoints(
  domain: ReadonlyAclDomain,
  points: ReadonlyVec3[]
) {
  switch (domain.kind) {
    case "aabb":
      return points.every((p) => containsAABB(domain.aabb, p));
    case "point":
      return points.length === 1 && isEqual(domain.point, points[0]);
    case "points":
      return points.every((p) => domain.points.some((d) => isEqual(d, p)));
  }
}

// This function resolves all table queries necessary to perform ACL checks
// within a given domain.
export function aclEntitiesForDomain(
  domain: ReadonlyAclDomain,
  table: AclsTable
): AclEntities {
  const protections = prioritizeProtectionEntities(
    getProtectionEntitiesForDomain(domain, table)
  );

  return { domain, protections };
}

export function aclsForEntities(aclEntities: AclEntities) {
  const protectionAcls = getProtectionAclsForEntities(
    aclEntities.domain,
    aclEntities.protections
  );

  return protectionAcls;
}

export function aclForEntity(
  aclEntity: ReadonlyEntityWith<"acl_component">
): ReadonlyIndexedAcl {
  return inheritFromLand({ ...aclEntity.acl_component.acl, id: aclEntity.id });
}

export function* pointsForAclDomain(
  domain: ReadonlyAclDomain
): Generator<ReadonlyVec3i> {
  switch (domain.kind) {
    case "aabb":
      yield* aabbIterator(integerAABB(domain.aabb));
      break;
    case "point":
      yield floor(domain.point);
      break;
    case "points":
      for (const point of domain.points) {
        yield floor(point);
      }
      break;
  }
}

export function pointsByShardForAclDomain(domain: ReadonlyAclDomain) {
  const pointsByShard = new DefaultMap<ShardId, ReadonlyVec3i[]>(() => []);
  for (const point of pointsForAclDomain(domain)) {
    const shardId = Shards.voxelShard(...point);
    const blockPos = Shards.blockPos(...point);
    pointsByShard.get(shardId).push(blockPos);
  }
  return pointsByShard;
}

function getProtectionAclsForEntities(
  domain: ReadonlyAclDomain,
  protectionEntities: ReadonlyEntityWith<
    "acl_component" | "size" | "position" | "protection"
  >[]
): ReadonlyIndexedAcl[] {
  const protectionAcls = protectionEntities.map((x) =>
    inheritFromLand({ ...x.acl_component.acl, id: x.id })
  );
  if (protectionAcls.length === 0) {
    return [DEFAULT_MUCK_ACL];
  }

  return protectionAcls;
}

function prioritizeProtectionEntities(
  protectionEntities: ReadonlyEntityWith<
    "acl_component" | "size" | "position" | "protection"
  >[]
) {
  // Returns the protection entity with the lowest timestamp.
  const entities = first(
    [...protectionEntities].sort(
      (a, b) => (a.protection.timestamp ?? 0) - (b.protection.timestamp ?? 0)
    )
  );
  return entities ? [entities] : [];
}

function getProtectionEntitiesForDomain(
  domain: ReadonlyAclDomain,
  table: AclsTable
): ReadonlyEntityWith<"acl_component" | "size" | "position" | "protection">[] {
  switch (domain.kind) {
    case "aabb":
      return Array.from(
        table.scan(ProtectionSelector.query.spatial.inAabb(domain.aabb))
      );
    case "point":
      return Array.from(
        table.scan(ProtectionSelector.query.spatial.atPoint(domain.point))
      );
    case "points":
      const entities = new Map<
        BiomesId,
        ReadonlyEntityWith<"acl_component" | "size" | "position" | "protection">
      >();
      for (const point of domain.points) {
        for (const entity of table.scan(
          ProtectionSelector.query.spatial.atPoint(point)
        )) {
          entities.set(entity.id, entity);
        }
      }
      return Array.from(entities.values());
  }
}

export function involvedShardsForAclDomain(
  domain: ReadonlyAclDomain
): ShardId[] {
  switch (domain.kind) {
    case "aabb":
      return shardsForAABB(...domain.aabb);
    case "point":
      return [voxelShard(...domain.point)];
    case "points":
      const ret = new Set<ShardId>();
      for (const point of domain.points) {
        ret.add(voxelShard(...point));
      }
      return [...ret];
  }
}

export function aclForTerrainPlacement(id: number) {
  if (id) {
    if (terrainLifetime(id)) {
      return "placeEphemeral";
    } else {
      return "place";
    }
  } else {
    return "destroy";
  }
}

export function itemActionAllowed(
  item: Item | undefined,
  aclCheck: (action: AclAction) => boolean
) {
  let itemAction = item?.action ?? "destroy";
  if (itemAction == "place" && item?.lifetime) {
    itemAction = "placeEphemeral";
  }

  return (
    ALWAYS_ALLOWED_ITEM_ACTIONS.includes(itemAction) ||
    !isAclAction(itemAction) ||
    aclCheck(itemAction)
  );
}
