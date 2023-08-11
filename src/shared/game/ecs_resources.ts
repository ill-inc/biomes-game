import type { ProposedChange, ReadonlyChanges } from "@/shared/ecs/change";
import { changedBiomesId } from "@/shared/ecs/change";
import type {
  ComponentResourcePaths,
  ReadonlyWorldMetadata,
} from "@/shared/ecs/gen/components";
import type { EntityResourcePaths } from "@/shared/ecs/gen/entities";
import {
  ENTITY_PROP_TO_RESOURCE_PATH,
  Entity,
  RESOURCE_PATH_TO_ENTITY_PROP,
} from "@/shared/ecs/gen/entities";
import { WorldMetadataId } from "@/shared/ecs/ids";
import type { MetaIndex } from "@/shared/ecs/selectors/selector";
import type { Table, VersionedTable } from "@/shared/ecs/table";
import { EmitterSubscription } from "@/shared/events";
import type { IndexedResources } from "@/shared/game/ecs_indexed_resources";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { BiomesResourcesBuilder } from "@/shared/resources/biomes";
import type { PathDef } from "@/shared/resources/path_map";
import type {
  TypedResourceDeps,
  TypedResources,
} from "@/shared/resources/types";
import { ok } from "assert";

interface BaseEcsResourcePaths {
  "/ecs/metadata": PathDef<[], ReadonlyWorldMetadata>;
}

export type EcsResourcePaths = BaseEcsResourcePaths &
  ComponentResourcePaths &
  EntityResourcePaths;

export type EcsResources = TypedResources<EcsResourcePaths>;
export type EcsResourceDeps = TypedResourceDeps<EcsResourcePaths>;
type EcsResourcesBuilder = BiomesResourcesBuilder<EcsResourcePaths>;

function invalidateEcsResource(
  localUserId: BiomesId | undefined,
  resources: EcsResources,
  change: ProposedChange
) {
  let deletedSelf = false;
  if (change.kind === "delete" || change.entity.iced) {
    const id = changedBiomesId(change);
    if (id === localUserId) {
      deletedSelf = true;
    }
    if (
      change.kind !== "delete" &&
      change.entity.iced &&
      !process.env.IS_SERVER
    ) {
      log.warn("Iced entity should not reach the client!", {
        entityId: change.entity.id,
      });
    }
    // Invalidate all components potentially held?
    for (const component of RESOURCE_PATH_TO_ENTITY_PROP.keys()) {
      resources.invalidate(component, id);
    }
    resources.invalidate("/ecs/entity", id);
  } else {
    // Invalidate just the relevant components.
    for (const component in change.entity) {
      const resourcePath =
        ENTITY_PROP_TO_RESOURCE_PATH[component as keyof Entity];
      if (resourcePath) {
        resources.invalidate(resourcePath, change.entity.id);
      } else {
        log.warn(`Unknown resource path for entity field: ${component}`);
      }
    }
    resources.invalidate("/ecs/entity", change.entity.id);
  }
  return deletedSelf;
}

export function invalidateEcsResources(
  localUserId: BiomesId | undefined,
  resources: EcsResources,
  changes: ReadonlyChanges | ProposedChange[]
): boolean {
  let deletedSelf = false;

  // Update all the indexes with the new values.
  for (const change of changes) {
    deletedSelf = invalidateEcsResource(localUserId, resources, change);
  }

  return deletedSelf;
}

export function registerResourceInvalidationForTable(
  localUserId: BiomesId | undefined,
  table: VersionedTable<number>,
  resources: EcsResources,
  indexedResources: IndexedResources,
  onDeletedSelf?: () => void
) {
  const eventEmitter = new EmitterSubscription(table.events, {
    preApply: (ids) => {
      for (const id of ids) {
        for (const indexedResource of indexedResources) {
          indexedResource.invalidate(resources, id);
        }
      }
    },
    postApply: (changes) => {
      const deletedSelf = invalidateEcsResources(
        localUserId,
        resources,
        changes
      );

      for (const change of changes) {
        const id = changedBiomesId(change);
        // Now correctly invalidate new key(s).
        for (const indexedResource of indexedResources) {
          indexedResource.invalidate(resources, id);
        }
      }

      if (deletedSelf && onDeletedSelf) {
        onDeletedSelf();
      }
    },
  });

  return () => eventEmitter.off();
}

export function addTableResources<MI extends MetaIndex<MI>>(
  table: Table<MI>,
  builder: EcsResourcesBuilder
) {
  builder.add("/ecs/metadata", () => {
    const entity = table.get(WorldMetadataId);
    ok(
      entity !== undefined && entity.world_metadata !== undefined,
      "Missing world metadata!"
    );
    return entity.world_metadata;
  });

  // Register resources for each game component and all ECS entities.
  // Important note!
  // We register these independently, with no deps rather than using dependencies
  // to express that an entity depends on all potential child components. This is
  // because we expect invalidation to operate at both levels.
  builder.add("/ecs/entity", (_deps: EcsResourceDeps, id: BiomesId) =>
    table.get(id)
  );

  for (const [path, entityProp] of RESOURCE_PATH_TO_ENTITY_PROP) {
    ((path, entityProp) => {
      builder.add(path, (_deps: EcsResourceDeps, id: BiomesId) => {
        const entity = table.get(id);
        if (Entity.has(entity, entityProp)) {
          return entity[entityProp];
        }
      });
    })(path, entityProp);
  }
}
