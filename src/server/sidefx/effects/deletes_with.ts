import type { SideEffect } from "@/server/sidefx/side_effect_types";
import type { SideFxTable } from "@/server/sidefx/table";
import type { ChangeToApply } from "@/shared/api/transaction";
import type { Change } from "@/shared/ecs/change";
import { changedBiomesId } from "@/shared/ecs/change";
import type { BiomesId } from "@/shared/ids";
import { DefaultMap } from "@/shared/util/collections";
import { ok } from "assert";

// Implements the side-effect logic where any entity with a `deletes_with`
// component will be deleted if the entity referenced by `deletes_with` does not
// exist (or is iced).
export class DeletesWithSideEffect implements SideEffect {
  readonly name = "deletesWith";

  // Keyed by all BiomesIds (representing entities) which should be deleted if
  // the value BiomesId entity is deleted (or iced).
  private deletesWith = new Map<BiomesId, BiomesId>();
  // Keyed by all BiomesIds (representing entities) whose deletion should cause
  // all entities in the value set to also be deleted.
  private deleteImpliesDeletes = new DefaultMap<BiomesId, Set<BiomesId>>(
    () => new Set()
  );
  // Essentially this means they're in the process of being deleted, but it
  // hasn't been confirmed yet.
  private toDelete = new Set<BiomesId>();

  constructor(private readonly table: SideFxTable) {}

  async postApply(changes: Change[]): Promise<ChangeToApply[]> {
    const applyChanges: ChangeToApply[] = [];

    // First record newly added deletes_with components.
    for (const change of changes) {
      if (change.kind === "delete") {
        continue;
      }
      if (!change.entity.deletes_with) {
        continue;
      }

      const previousDeletesWith = this.deletesWith.get(change.entity.id);
      if (previousDeletesWith) {
        this.deleteImpliesDeletes
          .get(previousDeletesWith)
          .delete(change.entity.id);
      }

      const deletesWith = this.table.get(change.entity.deletes_with.id);
      if (!deletesWith || deletesWith.iced) {
        this.deletesWith.delete(change.entity.id);
        this.toDelete.add(change.entity.id);
      } else {
        this.deletesWith.set(change.entity.id, change.entity.deletes_with.id);
        this.deleteImpliesDeletes
          .get(change.entity.deletes_with.id)
          .add(change.entity.id);
      }
    }

    // Now check for "delete_with" targets that were deleted.
    for (const change of changes) {
      if (change.kind !== "delete" && !change.entity.iced) {
        continue;
      }
      const deletedId = changedBiomesId(change);
      const deletionsCaused = this.deleteImpliesDeletes.get(deletedId);
      if (!deletionsCaused) {
        continue;
      }
      for (const id of deletionsCaused) {
        const wasDeleted = this.deletesWith.delete(id);
        ok(wasDeleted);
        this.toDelete.add(id);
      }
      this.deleteImpliesDeletes.delete(deletedId);
    }

    for (const id of this.toDelete) {
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
        this.toDelete.delete(id);
      }
    }

    return applyChanges;
  }
}
