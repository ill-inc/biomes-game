import type { ChangeToApply, Iff } from "@/shared/api/transaction";
import { ChangeBuffer } from "@/shared/ecs/change";
import type { AsDelta, ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { COMPONENT_ID_TO_PROP_NAME } from "@/shared/ecs/gen/entities";
import type { VersionedTable } from "@/shared/ecs/table";
import type { EntityVersion } from "@/shared/ecs/version";
import type { BiomesId } from "@/shared/ids";

// Like a ChangeBuffer but is capable of computing changes from versioned
// entity states to catch up a replica with minimal data.
export class EagerChangeBuffer extends ChangeBuffer {
  changesSince(
    id: BiomesId,
    from: number,
    version: EntityVersion,
    entity: ReadonlyEntity | undefined
  ) {
    if (version.tick < from) {
      return;
    }
    if (entity === undefined) {
      this.push([
        {
          kind: "delete",
          tick: version.tick,
          id,
        },
      ]);
      return;
    }
    if (version.tickByComponent === undefined) {
      // Cannot do better than a full create as we lack component versions.
      this.push([
        {
          kind: "create",
          tick: version.tick,
          entity,
        },
      ]);
      return;
    }
    const delta: AsDelta<ReadonlyEntity> = {
      id,
    };
    for (const key of COMPONENT_ID_TO_PROP_NAME) {
      if (key === undefined) {
        continue;
      }
      if (version.tickByComponent[key] > from) {
        (delta[key] as any) = entity[key] ?? null;
      }
    }
    this.push([
      {
        kind: "update",
        tick: version.tick,
        entity: delta,
      },
    ]);
  }
}

// Public for tests, use canApply below instead.
export function checkIff(
  iff: Iff,
  version: EntityVersion,
  entity: ReadonlyEntity | undefined
): boolean {
  const expected = iff[1];
  if (iff.length === 1 || expected === undefined) {
    return entity !== undefined;
  }
  if (version.tick <= expected) {
    return true;
  }
  if (entity === undefined && expected === 0) {
    return true;
  }
  if (iff.length === 2 || version.tickByComponent === undefined) {
    return false;
  }
  for (let i = 2; i < iff.length; ++i) {
    const componentVersion =
      version.tickByComponent[COMPONENT_ID_TO_PROP_NAME[iff[i]!]];
    if (componentVersion === undefined || componentVersion > expected) {
      return false;
    }
  }
  return true;
}

export function canApply(
  changeToApply: ChangeToApply,
  table: VersionedTable<EntityVersion>,
  eagerChanges?: EagerChangeBuffer
) {
  if (changeToApply.iffs === undefined) {
    return true;
  }
  let ok = true;
  for (const iff of changeToApply.iffs) {
    const [id] = iff as [BiomesId];
    const [version, entity] = table.getWithVersion(id);
    if (!checkIff(iff, version, entity)) {
      ok = false;
      if (eagerChanges !== undefined) {
        eagerChanges.changesSince(id, iff[1] ?? 0, version, entity);
      }
    }
  }
  return ok;
}
