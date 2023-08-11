import { LazyEntity, PatchableLazyEntity } from "@/server/shared/ecs/gen/lazy";
import type { WorldApi } from "@/server/shared/world/api";
import type { Iff } from "@/shared/api/transaction";
import type { ProposedChange } from "@/shared/ecs/change";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { BiomesId } from "@/shared/ids";
import { ok } from "assert";

export class WorldEditor {
  private readonly fetched = new Map<
    BiomesId,
    [number, PatchableLazyEntity | undefined]
  >();
  private readonly created = new Set<BiomesId>();

  constructor(private readonly worldApi: WorldApi) {}

  get(id: BiomesId): Promise<PatchableLazyEntity | undefined>;
  get(ids: BiomesId[]): Promise<(PatchableLazyEntity | undefined)[]>;
  async get(
    idOrIds: BiomesId | BiomesId[]
  ): Promise<
    PatchableLazyEntity | undefined | (PatchableLazyEntity | undefined)[]
  > {
    const singleResult = !Array.isArray(idOrIds);
    if (singleResult) {
      idOrIds = [idOrIds as BiomesId];
    }
    const ids = idOrIds as BiomesId[];
    const found = ids.map((id) => this.fetched.get(id));
    const missing: number[] = [];
    for (const [i, result] of found.entries()) {
      if (result === undefined) {
        missing.push(i);
      }
    }
    if (missing.length > 0) {
      const results = await this.worldApi.getWithVersion(
        missing.map((i) => ids[i])
      );
      for (const [i, [version, entity]] of results.entries()) {
        const patch = entity ? new PatchableLazyEntity(entity) : undefined;
        this.fetched.set(ids[missing[i]], [version, patch]);
        found[missing[i]] = [version, patch];
      }
    }
    const final = found as [number, PatchableLazyEntity | undefined][];
    return singleResult ? final[0][1] : final.map(([, e]) => e);
  }

  create(base: ReadonlyEntity): PatchableLazyEntity {
    const { id } = base;
    ok(!this.fetched.get(id)?.[1], "Entity already fetched and exists!");
    const entity = new PatchableLazyEntity(LazyEntity.empty(id));
    entity.copyFrom(base);
    this.fetched.set(id, [0, entity]);
    this.created.add(id);
    return entity;
  }

  async commit() {
    const changeToApply = {
      iffs: [] as Iff[],
      changes: [] as ProposedChange[],
    };
    for (const [id, [version, entity]] of this.fetched) {
      if (!entity) {
        changeToApply.iffs.push([id, 0]);
      } else if (this.created.has(id)) {
        changeToApply.iffs.push([id, 0]);
        changeToApply.changes.push({
          kind: "create",
          entity: entity.finishAsNew(),
        });
      } else {
        if (entity.readComponentIds.size > 0) {
          changeToApply.iffs.push([id, version, ...entity.readComponentIds]);
        }
        const delta = entity.finish();
        if (delta !== undefined) {
          changeToApply.changes.push({
            kind: "update",
            entity: delta,
          });
        }
      }
    }
    if (changeToApply.changes.length === 0) {
      return;
    }
    const { outcome } = await this.worldApi.apply(changeToApply);
    ok(outcome === "success", "Failed to apply change to world!");
  }
}
