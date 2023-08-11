import type { EntityFilter } from "@/server/shared/ecs/filter";
import { couldAffectPassing, passes } from "@/server/shared/ecs/filter";
import type { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import type { LazyChange } from "@/server/shared/ecs/lazy";
import type { BiomesLuaRedis } from "@/server/shared/world/lua/api";
import type { RedisCompiledFilter } from "@/server/shared/world/lua/serde";
import { filterToRedis } from "@/server/shared/world/lua/serde";
import { changedBiomesId } from "@/shared/ecs/change";
import type { BiomesId } from "@/shared/ids";
import { compactMap } from "@/shared/util/collections";

export interface ReadonlyFilterContext {
  filter(changes: LazyChange[]): LazyChange[];
}

export class FilterContext implements ReadonlyFilterContext {
  public readonly compiledFilter: RedisCompiledFilter;
  private readonly included = new Set<BiomesId>();

  constructor(
    private readonly redis: BiomesLuaRedis,
    private readonly filterConfig: EntityFilter
  ) {
    this.compiledFilter = filterToRedis(filterConfig);
  }

  clear(): void {
    this.included.clear();
  }

  private async computeInclusionUpdates(
    changes: LazyChange[]
  ): Promise<Map<BiomesId, [number, LazyEntity | undefined]>> {
    const ids: BiomesId[] = [];
    for (const change of changes) {
      if (
        change.kind === "update" &&
        couldAffectPassing(change, this.filterConfig)
      ) {
        ids.push(change.entity.id);
      }
    }
    if (ids.length === 0) {
      return new Map();
    }
    const results = await this.redis.ecs.filteredGet(ids, this.compiledFilter);
    return new Map(
      ids.map((id, idx) => {
        return [id, results[idx]];
      })
    );
  }

  private processChange(
    updatedIncluded: Map<BiomesId, [number, LazyEntity | undefined]>,
    change: LazyChange
  ): LazyChange | undefined {
    switch (change.kind) {
      case "delete":
        if (this.included.delete(change.id)) {
          // Pass on a delete only if we'd previously sent it.
          return change;
        }
        break;
      case "create":
        if (passes(change.entity, this.filterConfig)) {
          // The newly created entity passes the filter.
          this.included.add(change.entity.id);
          return change;
        } else if (this.included.delete(change.entity.id)) {
          // The newly created entity doesn't pass the filter,
          // but had previously been known to the client so delete.
          return {
            kind: "delete",
            tick: change.tick,
            id: change.entity.id,
          };
        }
        break;
      case "update":
        {
          // Check if this update event could affect the inclusion.
          const nowIncluded = updatedIncluded.get(change.entity.id);
          if (nowIncluded !== undefined) {
            // It did affect inclusion.
            const [tick, entity] = nowIncluded;
            if (entity) {
              if (this.included.has(change.entity.id)) {
                // It is included, and was included - passthrough.
                return change;
              } else {
                // It is included, but wasn't included - create.
                this.included.add(change.entity.id);
                return {
                  kind: "create",
                  tick,
                  entity,
                };
              }
            } else if (this.included.delete(change.entity.id)) {
              // It is not included, but was included - delete.
              return {
                kind: "delete",
                tick: change.tick,
                id: change.entity.id,
              };
            }
          } else if (this.included.has(change.entity.id)) {
            // Inclusion was not affected by this change.
            return change;
          }
        }
        break;
    }
  }

  // Like process, but doesn't change inclusion of the current set.
  filter(changes: LazyChange[]): LazyChange[] {
    return compactMap(changes, (change) =>
      this.included.has(changedBiomesId(change)) ? change : undefined
    );
  }

  async process(changes: LazyChange[]): Promise<LazyChange[]> {
    const updatedIncluded = await this.computeInclusionUpdates(changes);
    return compactMap(changes, (change) =>
      this.processChange(updatedIncluded, change)
    );
  }
}
