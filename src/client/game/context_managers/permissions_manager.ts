import type { ClientContext } from "@/client/game/context";
import type { AuthManager } from "@/client/game/context_managers/auth_manager";
import type { ClientTable } from "@/client/game/game";
import type {
  ClientReactResources,
  ClientResources,
} from "@/client/game/resources/types";
import type { Item, ReadonlyAclAction } from "@/shared/ecs/gen/types";
import {
  aclsForDomain,
  actionAllowed,
  itemActionAllowed,
} from "@/shared/game/acls";
import type { ReadonlyIndexedAcl } from "@/shared/game/acls_base";
import { ALWAYS_ALLOWED_ITEM_ACTIONS } from "@/shared/game/players";
import { ALLOWED_TEMPORARY_BLOCK_ACTIONS } from "@/shared/game/restoration";
import * as Shard from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { aabbIterator } from "@/shared/math/linear";
import type { ReadonlyAABB, ReadonlyVec3 } from "@/shared/math/types";
import type { RegistryLoader } from "@/shared/registry";
import { first } from "lodash";

export class PermissionsManager {
  constructor(
    private readonly resources: ClientResources,
    private readonly authManager: AuthManager,
    private readonly table: ClientTable
  ) {}

  robotIdAt(
    resources: ClientResources | ClientReactResources,
    position: ReadonlyVec3
  ): BiomesId | undefined {
    const protectionAcls = this.aclsForPosition(position).filter((e) => !!e.id);
    const protectionId = first(protectionAcls)?.id;
    const maybeRobotId = protectionId
      ? resources.get("/ecs/c/created_by", protectionId)?.id
      : undefined;
    return maybeRobotId;
  }

  robotOwnerIdAt(
    resources: ClientResources | ClientReactResources,
    position: ReadonlyVec3 | undefined
  ) {
    const robotId = position && this.robotIdAt(resources, position);
    const userId = robotId && resources.get("/ecs/c/created_by", robotId)?.id;
    return userId;
  }

  isTemporaryPlacementAt(pos: ReadonlyVec3, entityId?: BiomesId) {
    if (entityId) {
      const restoresTo = this.resources.get("/ecs/c/restores_to", entityId);
      return restoresTo?.restore_to_state === "deleted";
    } else {
      const shardId = Shard.voxelShard(...pos);
      const blockPos = Shard.blockPos(...pos);
      const restorations = this.resources.get("/terrain/restorations", shardId);
      return restorations?.getRestoreDataAt(blockPos)?.terrain !== undefined;
    }
  }

  getPermissionForAction(
    pos: ReadonlyVec3,
    action: ReadonlyAclAction,
    entityId?: BiomesId
  ): boolean {
    if (
      (this.isTemporaryPlacementAt(pos, entityId) &&
        ALLOWED_TEMPORARY_BLOCK_ACTIONS.includes(action)) ||
      ALWAYS_ALLOWED_ITEM_ACTIONS.includes(action)
    ) {
      return true;
    }
    const entityAcl =
      entityId !== undefined
        ? this.resources.get("/ecs/c/acl_component", entityId)?.acl
        : undefined;

    return (
      this.clientActionAllowedAt(action, pos) &&
      (!entityAcl || this.clientActionAllowed(action, entityAcl))
    );
  }

  clientActionAllowedAt(
    action: ReadonlyAclAction,
    ...positions: ReadonlyVec3[]
  ): boolean {
    const acls = this.aclsForPositions(...positions);
    const allowed = this.clientActionAllowed(action, ...acls);
    return allowed;
  }

  itemActionAllowedAt(
    item: Item | undefined,
    ...positions: ReadonlyVec3[]
  ): boolean {
    const acls = this.aclsForPositions(...positions);
    const allowed = this.itemActionAllowed(item, ...acls);
    return allowed;
  }

  itemActionAllowedAABB(item: Item | undefined, aabb: ReadonlyAABB): boolean {
    return this.itemActionAllowedAt(item, ...aabbIterator(aabb));
  }

  clientActionAllowedAABB(
    action: ReadonlyAclAction,
    aabb: ReadonlyAABB
  ): boolean {
    return this.clientActionAllowedAt(action, ...aabbIterator(aabb));
  }

  protectionAclsForPosition(pos: ReadonlyVec3): ReadonlyIndexedAcl[] {
    return aclsForDomain({ kind: "point", point: pos }, this.table);
  }

  *aclsForPositions(
    ...positions: ReadonlyVec3[]
  ): Generator<ReadonlyIndexedAcl> {
    const seenIds = new Set<BiomesId | undefined>();
    for (const pos of positions) {
      const acls = this.aclsForPosition(pos);
      for (const acl of acls) {
        if (acl && !seenIds.has(acl?.id)) {
          seenIds.add(acl.id);
          yield acl;
        }
      }
    }
  }

  aclsForPosition(pos: ReadonlyVec3): ReadonlyIndexedAcl[] {
    return this.resources.get("/ruleset/current").aclsForPosition(pos);
  }

  itemActionAllowed(item: Item | undefined, ...acls: ReadonlyIndexedAcl[]) {
    return itemActionAllowed(item, (action) =>
      this.clientActionAllowed(action, ...acls)
    );
  }

  clientActionAllowed(
    action: ReadonlyAclAction,
    ...acls: ReadonlyIndexedAcl[]
  ): boolean {
    const user = this.authManager.currentUser;

    const teamId = this.resources.get(
      "/ecs/c/player_current_team",
      user.id
    )?.team_id;

    return actionAllowed(acls, action, { userId: user.id, teamId }, (role) =>
      user.hasSpecialRole(role)
    );
  }
}

export async function loadPermissionsManager(
  loader: RegistryLoader<ClientContext>
): Promise<PermissionsManager> {
  const [resources, authManager, table] = await Promise.all([
    loader.get("resources"),
    loader.get("authManager"),
    loader.get("table"),
  ]);
  return new PermissionsManager(resources, authManager, table);
}
