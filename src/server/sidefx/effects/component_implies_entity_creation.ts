import type { IdGenerator } from "@/server/shared/ids/generator";
import type { SideEffect } from "@/server/sidefx/side_effect_types";
import type { SideFxTable } from "@/server/sidefx/table";
import type { ChangeToApply } from "@/shared/api/transaction";
import type { Change } from "@/shared/ecs/change";
import type {
  AsDelta,
  ComponentName,
  ReadonlyEntity,
  ReadonlySuperEntity,
} from "@/shared/ecs/gen/entities";
import { Entity } from "@/shared/ecs/gen/entities";
import type { BiomesId } from "@/shared/ids";
import { ok } from "assert";
import { isEqual } from "lodash";

export type EntityWithOnly<
  Required extends ComponentName,
  Optional extends ComponentName = never
> = Pick<ReadonlySuperEntity, Required | "id"> & Pick<ReadonlyEntity, Optional>;

// Implements the side-effect logic where the existence of a component on an
// entity implies that a separate entity should be created. When the component
// is found on an entity in an uninitialized state (`getImpliedId()` returns
// `undefined`), then a new entity is created.
export class ComponentImpliesEntityCreationSideEffect<
  RC extends ComponentName,
  OC extends ComponentName
> implements SideEffect
{
  // We use the term "implies" and "implied" when referring to the entities
  // involved here. The "implies" entity is the one that triggers the creation
  // of the "implied" entity.
  private impliedsToDelete = new Set<BiomesId>();
  private needsImpliedCreationCheck = new Set<BiomesId>();

  constructor(
    readonly name: string,
    private readonly table: SideFxTable,
    private readonly idGenerator: IdGenerator,
    private readonly params: {
      components: RC[];
      optionalComponents?: OC[];
      // The id of the implied entity extracted from the component, or
      // `undefined` if the entity doesn't have an implied entity created yet.
      getImpliedId: (e: EntityWithOnly<RC, OC>) => BiomesId | undefined;
      // Logic for creating the derived entity.
      createEntity: (
        implies: EntityWithOnly<RC, OC>
      ) => Omit<ReadonlyEntity, "id"> | undefined;
      // How the creator should be updated to reflect the creation of the
      // implied entity.
      updateCreator: (
        implies: EntityWithOnly<RC, OC>,
        createdId: BiomesId
      ) => AsDelta<ReadonlyEntity>;
    }
  ) {}

  // Need to check for deletions before updating the table, so that we can
  // access the full entity before it's deleted.
  preApply(changes: Change[]) {
    for (const change of changes) {
      if (change.kind === "delete" || change.entity.iced) {
        // Handled by the `deletes_with` side effect added to the implied
        // entity.
        continue;
      }

      // Check if required component are being removed or updated.
      for (const componentName of this.params.components) {
        const component = change.entity[componentName];
        if (component === null) {
          const previousEntity = this.table.get(change.entity.id);
          if (
            previousEntity &&
            Entity.has(previousEntity, ...this.params.components)
          ) {
            const impliedId = this.params.getImpliedId(
              previousEntity as EntityWithOnly<RC, OC>
            );
            if (impliedId) {
              // If a required component has been removed, schedule the implied
              // entity for deletion.
              this.impliedsToDelete.add(impliedId);
              break;
            }
          }
        } else if (component !== undefined) {
          this.needsImpliedCreationCheck.add(change.entity.id);
        }
      }

      // Check if any optional dependent component is being updated.
      for (const componentName of this.params.optionalComponents ?? []) {
        const component = change.entity[componentName];
        if (component !== undefined) {
          this.needsImpliedCreationCheck.add(change.entity.id);
        }
      }

      if (change.entity.iced === null) {
        this.needsImpliedCreationCheck.add(change.entity.id);
      }
    }
  }

  async postApply(_changes: Change[]): Promise<ChangeToApply[]> {
    const applyChanges: ChangeToApply[] = [];

    for (const id of this.impliedsToDelete) {
      if (this.table.get(id)) {
        applyChanges.push({
          changes: [
            {
              kind: "delete",
              id: id,
            },
          ],
        });
      } else {
        this.impliedsToDelete.delete(id);
      }
    }

    for (const id of this.needsImpliedCreationCheck) {
      const [impliesVersion, impliesEntityWide] = this.table.getWithVersion(id);
      if (
        impliesEntityWide?.iced ||
        !Entity.has(impliesEntityWide, ...this.params.components)
      ) {
        this.needsImpliedCreationCheck.delete(id);
        continue;
      }
      const impliesEntity = impliesEntityWide as EntityWithOnly<RC, OC>;

      const impliedEntityId = this.params.getImpliedId(impliesEntity);
      const impliedEntityWithVersion = impliedEntityId
        ? this.table.getWithVersion(impliedEntityId)
        : undefined;

      const update = await (async () => {
        if (impliedEntityWithVersion && impliedEntityWithVersion[1]) {
          return this.checkImpliedNeedsUpdate(
            applyChanges,
            impliesEntity,
            impliedEntityWithVersion[0],
            impliedEntityWithVersion[1]
          );
        } else {
          return this.checkImpliedNeedsCreation(
            applyChanges,
            impliesVersion,
            impliesEntity,
            this.idGenerator
          );
        }
      })();

      if (update) {
        applyChanges.push(update);
      } else {
        // If no updates were needed, then this entity no longer needs to be
        // tracked, it's updated.
        this.needsImpliedCreationCheck.delete(id);
      }
    }

    return applyChanges;
  }

  private checkImpliedNeedsUpdate(
    applyChanges: ChangeToApply[],
    impliesEntity: EntityWithOnly<RC, OC>,
    impliedVersion: number,
    impliedEntity: ReadonlyEntity
  ): ChangeToApply | undefined {
    const newEntity = this.params.createEntity(impliesEntity);
    if (newEntity === undefined) {
      return {
        changes: [
          {
            kind: "delete",
            id: impliedEntity.id,
          },
        ],
      };
    }

    // Check if an update is needed.
    const delta = diffEntity(impliedEntity, newEntity);
    if (delta) {
      return {
        iffs: [[impliedEntity.id, impliedVersion]],
        changes: [
          {
            kind: "update",
            entity: delta,
          },
        ],
      };
    } else {
      return;
    }
  }
  private async checkImpliedNeedsCreation(
    applyChanges: ChangeToApply[],
    impliesVersion: number,
    impliesEntity: EntityWithOnly<RC, OC>,
    idGenerator: IdGenerator
  ): Promise<ChangeToApply | undefined> {
    const newEntity = this.params.createEntity(impliesEntity);
    if (newEntity === undefined) {
      return;
    }

    // Create a new implied entity since one does not already exist.
    const impliedEntity = {
      id: await idGenerator.next(),
      ...newEntity,
    };

    // Make sure the deleted entity marks us to be deleted alongside.
    ok(impliedEntity.deletes_with!.id === impliesEntity.id);

    return {
      iffs: [[impliesEntity.id, impliesVersion]],
      changes: [
        {
          kind: "update",
          entity: this.params.updateCreator(impliesEntity, impliedEntity.id),
        },
        {
          kind: "create",
          entity: impliedEntity,
        },
      ],
    };
  }
}

// Returns an entity delta where if any value of b differs from any value of a,
// then the value of b is set in the delta.
function diffEntity(
  a: ReadonlyEntity,
  b: Omit<ReadonlyEntity, "id">
): AsDelta<ReadonlyEntity> | undefined {
  let delta: AsDelta<ReadonlyEntity> | undefined;

  for (const [componentNameStr, componentValue] of Object.entries(b)) {
    const componentName = componentNameStr as ComponentName;
    if (!isEqual(componentValue, a[componentName])) {
      if (delta === undefined) {
        delta = { id: a.id };
      }
      delta[componentName] = componentValue as any;
    }
  }
  return delta;
}
