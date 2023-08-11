import type { IdGenerator } from "@/server/shared/ids/generator";
import type { EntityWithOnly } from "@/server/sidefx/effects/component_implies_entity_creation";
import { ComponentImpliesEntityCreationSideEffect } from "@/server/sidefx/effects/component_implies_entity_creation";
import type { SideFxTable } from "@/server/sidefx/table";
import {
  AclComponent,
  CreatedBy,
  DeletesWith,
  Position,
  Protection,
  Restoration,
  Size,
} from "@/shared/ecs/gen/components";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { ReadonlyAcl } from "@/shared/ecs/gen/types";
import {
  DEFAULT_BUILD_ACTIONS,
  DEFAULT_TEAM_ACTIONS,
} from "@/shared/game/acls_base";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { nearestGridPosition, sub } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";

type Projector = EntityWithOnly<
  "projects_protection" | "position",
  "created_by"
>;

function getProjectedPosition({
  position,
  projects_protection: { size, snapToGrid },
}: Projector): Vec3 {
  // Size is currently assuming bottom-center as origin, so offset the field
  // position so that it is center-center origin.
  return sub(
    snapToGrid ? nearestGridPosition(position.v, size, snapToGrid) : position.v,
    [0, size[1] / 2, 0]
  );
}

function commonProjectedComponents(projector: Projector) {
  return {
    size: Size.create({ v: [...projector.projects_protection.size] }),
    position: Position.create({ v: getProjectedPosition(projector) }),
    deletes_with: DeletesWith.create({ id: projector.id }),
    created_by: CreatedBy.create({
      id: projector.id,
      created_at: projector.projects_protection.timestamp,
    }),
  };
}

function findPlayerCreatorParent(table: SideFxTable, id: BiomesId) {
  const visited = new Set<BiomesId>([id]);
  while (true) {
    const entity = table.get(id);
    if (!entity) {
      return;
    }
    if (entity?.remote_connection) {
      return entity;
    }
    const parent = entity?.created_by?.id;
    if (!parent || visited.has(parent)) {
      return;
    }
    visited.add(parent);
    id = parent;
  }
}

// Todo: remove this once it's automatic.
// Issue right now is the denormalization side-effect clashes with the diff
// done here, so they two fight each other.
function denormalizeAcl(
  table: SideFxTable,
  entity: EntityWithOnly<never, "created_by">,
  acl: ReadonlyAcl
) {
  const player = findPlayerCreatorParent(table, entity.id);

  const aclComponent = AclComponent.clone({ acl });
  // Owner unconditionally has full access.
  // TODO: Use side-effect server to update denormalized ACLs.
  aclComponent.acl.creator = entity.created_by
    ? [player?.id ?? INVALID_BIOMES_ID, DEFAULT_BUILD_ACTIONS]
    : undefined;
  aclComponent.acl.creatorTeam = [
    player?.player_current_team?.team_id ?? INVALID_BIOMES_ID,
    DEFAULT_TEAM_ACTIONS,
  ];
  return aclComponent;
}

// Make it so protection projecting entities always have an associated child
// representing the projected protection.
function createProjectedProtectionEntity(
  table: SideFxTable,
  projector: Projector
): Omit<ReadonlyEntity, "id"> | undefined {
  if (!projector.projects_protection.protection) {
    return;
  }
  const acl = projector.projects_protection.protection.acl;
  return {
    protection: Protection.create({
      timestamp: projector.projects_protection.timestamp,
    }),
    acl_component: denormalizeAcl(table, projector, acl),
    ...commonProjectedComponents(projector),
  };
}

function createProjectedRestorationEntity(
  table: SideFxTable,
  projector: Projector
): Omit<ReadonlyEntity, "id"> | undefined {
  if (!projector.projects_protection.restoration) {
    return;
  }
  const acl = projector.projects_protection.restoration.acl;
  return {
    restoration: Restoration.create({
      timestamp: projector.projects_protection.timestamp,
      restore_delay_s:
        projector.projects_protection.restoration.restore_delay_s,
    }),
    acl_component: denormalizeAcl(table, projector, acl),
    ...commonProjectedComponents(projector),
  };
}

export function makeProjectsProtectionSideEffect(
  table: SideFxTable,
  idGenerator: IdGenerator
) {
  return new ComponentImpliesEntityCreationSideEffect(
    "projectsProtection",
    table,
    idGenerator,
    {
      components: ["projects_protection", "position"],
      optionalComponents: ["created_by"],
      getImpliedId: (e) => e.projects_protection.protectionChildId,
      createEntity: (o) => createProjectedProtectionEntity(table, o),
      updateCreator: (o, createdId) => {
        const editProjector = new PatchableEntity(o);
        editProjector.mutableProjectsProtection().protectionChildId = createdId;
        return editProjector.finish()!;
      },
    }
  );
}

export function makeProjectsRestorationSideEffect(
  table: SideFxTable,
  idGenerator: IdGenerator
) {
  return new ComponentImpliesEntityCreationSideEffect(
    "projectsRestoration",
    table,
    idGenerator,
    {
      components: ["projects_protection", "position"],
      optionalComponents: ["created_by"],
      getImpliedId: (e) => e.projects_protection.restorationChildId,
      createEntity: (o) => createProjectedRestorationEntity(table, o),
      updateCreator: (o, createdId) => {
        const editProjector = new PatchableEntity(o);
        editProjector.mutableProjectsProtection().restorationChildId =
          createdId;
        return editProjector.finish()!;
      },
    }
  );
}
