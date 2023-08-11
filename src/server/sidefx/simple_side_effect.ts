import { ChangeSet } from "@/server/logic/events/context/change_set";
import { VersionedEntitySource } from "@/server/logic/events/context/versioned_entity_source";
import type { SideEffect } from "@/server/sidefx/side_effect_types";
import type { SideFxTable } from "@/server/sidefx/table";
import type { ChangeToApply } from "@/shared/api/transaction";
import type { Change } from "@/shared/ecs/change";
import { ChangeBuffer, changedBiomesId } from "@/shared/ecs/change";
import { DeltaPatch, type Delta } from "@/shared/ecs/gen/delta";
import type { ComponentName } from "@/shared/ecs/gen/entities";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { ShadowMap } from "@/shared/util/shadow_map";
import type { VoxelooModule } from "@/shared/wasm/types";

export type ProvideEntityFn = (id: BiomesId) => Delta | undefined;

export class SimpleSideEffectContext {
  private readonly requested = new ShadowMap<BiomesId, Delta>();

  constructor(private readonly changeSet: ChangeSet<any>) {}

  delete(id: BiomesId) {
    this.changeSet.delete(id);
  }

  get(id: BiomesId): Delta | undefined {
    const [cached, ok] = this.requested.get(id);
    if (ok) {
      return cached;
    }
    const [, entity] = this.changeSet.get("none", id);
    this.requested.set(id, entity);
    return entity;
  }

  finish(): boolean {
    let hadEffect = this.changeSet.dirty;
    for (const delta of this.requested.values()) {
      if (delta instanceof DeltaPatch && delta.commit()) {
        hadEffect = true;
      }
    }
    return hadEffect;
  }
}

// Simplified Side-effect handler that uses the logic-server logic to process
// changes individually.
export abstract class SimpleSideEffect implements SideEffect {
  private readonly pending = new ChangeBuffer();

  constructor(
    readonly name: string,
    protected readonly voxeloo: VoxelooModule,
    protected readonly table: SideFxTable,
    private readonly relevantComponents: [ComponentName, ...ComponentName[]]
  ) {}

  async postApply(newChanges: Change[]): Promise<ChangeToApply[]> {
    this.pending.push(newChanges.filter((c) => this.isChangeRelevant(c)));

    const work = this.pending.pop();
    if (work.length === 0) {
      return [];
    }

    // Keep track of which entities were fetched in order to ensure
    // we appropriately merge changes across handlers in this batch.
    const changeSet = new ChangeSet(
      new VersionedEntitySource(this.voxeloo, this.table)
    );

    const changesThatHadEffect: Change[] = [];
    for (const change of work) {
      const context = new SimpleSideEffectContext(changeSet);
      try {
        const id = changedBiomesId(change);
        this.handleChange(context, id, context.get(id), change);
      } catch (error) {
        log.error("Failed to process change", { error });
      }
      if (context.finish()) {
        changesThatHadEffect.push(change);
      }
    }
    // Keep the changes that had effects around to be processed in future.
    // Eventually they are handled with no-effect, and thus removed.
    this.pending.push(changesThatHadEffect);

    const finalized = changeSet.build();
    if (!finalized) {
      return [];
    }
    return [finalized.transaction];
  }

  protected isChangeRelevant(change: Change): boolean {
    if (change.kind === "delete") {
      return true;
    }
    for (const key of this.relevantComponents) {
      if (key in change.entity) {
        return true;
      }
    }
    return false;
  }

  protected abstract handleChange(
    context: SimpleSideEffectContext,
    id: BiomesId,
    entity: Delta | undefined,
    change: Change
  ): void;
}
