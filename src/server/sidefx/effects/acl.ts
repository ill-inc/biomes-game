import { InvalidationDependencyTracker } from "@/server/sidefx/dependency_tracker";
import type { SimpleSideEffectContext } from "@/server/sidefx/simple_side_effect";
import { SimpleSideEffect } from "@/server/sidefx/simple_side_effect";
import type { SideFxTable } from "@/server/sidefx/table";
import type { Delta } from "@/shared/ecs/gen/delta";
import type { ReadonlyAcl } from "@/shared/ecs/gen/types";
import { INVALID_BIOMES_ID, type BiomesId } from "@/shared/ids";
import type { VoxelooModule } from "@/shared/wasm/types";

function hasAclDependencies(acl: ReadonlyAcl | undefined) {
  return acl && (acl.creator || acl.creatorTeam);
}

// When an ACL refers to its creator (or creator's team), we track the
// creator-chain to the nearest player and appropriately denormalize the
// values into the ACL to make read-time cheap to check.
export class AclSideEffect extends SimpleSideEffect {
  private readonly depTracker = new InvalidationDependencyTracker<
    BiomesId,
    BiomesId
  >();

  constructor(voxeloo: VoxelooModule, table: SideFxTable) {
    super("acl", voxeloo, table, [
      "acl_component",
      "created_by",
      "player_current_team",
    ]);
  }

  private findPlayerCreatorParent(
    context: SimpleSideEffectContext,
    id: BiomesId
  ): Delta | undefined {
    const visited = new Set<BiomesId>([id]);
    let current = id;
    let player: Delta | undefined;
    while (true) {
      const entity = context.get(current);
      if (!entity) {
        break;
      }
      if (entity.remoteConnection()) {
        player = entity;
        break;
      }
      const parent = entity.createdBy()?.id;
      if (!parent || visited.has(parent)) {
        break;
      }
      visited.add(parent);
      current = parent;
    }
    this.depTracker.set(id, visited);
    return player;
  }

  private updateAcl(context: SimpleSideEffectContext, id: BiomesId) {
    const acl = context.get(id);
    if (!acl) {
      // It was deleted in this batch of changes, another call
      // to handleChange will appropriate clean it up.
      return;
    }
    const player = this.findPlayerCreatorParent(context, id);
    if (acl.aclComponent()?.acl.creator) {
      const playerId = player?.id ?? INVALID_BIOMES_ID;
      if (acl.aclComponent()?.acl.creator?.[0] !== playerId) {
        acl.mutableAclComponent()!.acl.creator![0] = playerId;
      }
    }
    if (acl.aclComponent()?.acl.creatorTeam) {
      const teamId = player?.playerCurrentTeam()?.team_id ?? INVALID_BIOMES_ID;
      if (acl.aclComponent()?.acl.creatorTeam?.[0] !== teamId) {
        acl.mutableAclComponent()!.acl.creatorTeam![0] = teamId;
      }
    }
  }

  protected handleChange(
    context: SimpleSideEffectContext,
    id: BiomesId,
    entity: Delta | undefined
  ): void {
    const entityHasAcpDependencies = hasAclDependencies(
      entity?.aclComponent()?.acl
    );
    if (!entity || !entityHasAcpDependencies) {
      // The ACL was deleted, so it can no longer be supported by anything
      this.depTracker.removeKey(id);
    }
    if (entityHasAcpDependencies && !this.depTracker.hasKey(id)) {
      // Newly encountered ACL.
      this.updateAcl(context, id);
    } else {
      // Update anything supported by this entity.
      for (const acl of this.depTracker.getKeys(id)) {
        this.updateAcl(context, acl);
      }
    }
  }
}
