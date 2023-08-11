import type { SpecialRoles } from "@/shared/acl_types";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import type * as ecs from "@/shared/ecs/gen/components";
import type {
  AsDelta,
  EntityWith,
  ReadonlyEntityWith,
} from "@/shared/ecs/gen/entities";
import type {
  AclAction,
  ReadonlyAclDomain,
  ReadonlyTerrainRestorationEntry,
  TerrainRestorationEntry,
} from "@/shared/ecs/gen/types";
import { createComponentSelector } from "@/shared/ecs/selectors/helper";
import type { Table } from "@/shared/ecs/table";
import { actionAllowed } from "@/shared/game/acls";
import { voxelIndexToPos, voxelPosToIndex } from "@/shared/game/shard";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { ReadonlyVec3 } from "@/shared/math/types";
import { first } from "lodash";

const restorationComponents = [
  "restoration",
  "position",
  "size",
  "acl_component",
] as const;
export type RestorationEntity = ReadonlyEntityWith<
  (typeof restorationComponents)[number]
>;

export const RestorationSelector = createComponentSelector(
  "restoration",
  ...restorationComponents
);

export function createRestorationIndexConfig() {
  return { ...RestorationSelector.createIndexFor.spatial() };
}

export type RestorationMetaIndex = ReturnType<
  typeof createRestorationIndexConfig
>;
export type RestorationTable = Table<RestorationMetaIndex>;

export const RESTOREABLE_TERRAIN_ATTRIBUTES = [
  "terrain",
  "placer",
  "shape",
  "dye",
] as const;
export type RestorableTerrainAttributeKey =
  (typeof RESTOREABLE_TERRAIN_ATTRIBUTES)[number];

// For a given set of restoration fields that apply for a given action, returns
// the shortest restoration delay in seconds that should be assigned to a change
// or undefined if restoration does not apply.
export function fieldRestorationDelay(
  restorations: RestorationEntity[],
  userId: BiomesId,
  teamId: BiomesId | undefined,
  hasRole: (role: SpecialRoles) => boolean,
  action: AclAction
): number | undefined {
  // Choose the shortest restoration time out of all that apply.
  let minDelay: number | undefined;
  for (const entity of restorations) {
    if (
      !actionAllowed(
        [entity.acl_component.acl],
        action,
        { userId, teamId },
        hasRole
      )
    ) {
      const delay = entity.restoration.restore_delay_s;
      minDelay = Math.min(minDelay ?? Number.POSITIVE_INFINITY, delay);
    }
  }
  return minDelay;
}

export function getRestorationEntitiesForDomain(
  domain: ReadonlyAclDomain,
  table: RestorationTable
): RestorationEntity[] {
  switch (domain.kind) {
    case "aabb":
      return Array.from(
        table.scan(RestorationSelector.query.spatial.inAabb(domain.aabb))
      );
    case "point":
      return Array.from(
        table.scan(RestorationSelector.query.spatial.atPoint(domain.point))
      );
    case "points":
      const entities = new Map<BiomesId, RestorationEntity>();
      for (const point of domain.points) {
        for (const entity of table.scan(
          RestorationSelector.query.spatial.atPoint(point)
        )) {
          entities.set(entity.id, entity);
        }
      }
      return Array.from(entities.values());
  }
}

type RestorationMap = Map<number, TerrainRestorationEntry>;
type ReadonlyRestorationMap = ReadonlyMap<number, TerrainRestorationEntry>;

export interface RestorationTerrainSetter {
  // Used to verify that occupancy is empty before restoring.
  getOccupancy: (pos: ReadonlyVec3) => BiomesId;
  set: (
    pos: ReadonlyVec3,
    values: {
      [K in RestorableTerrainAttributeKey]: number | undefined;
    }
  ) => void;
}

// Wrapper class around the component that stores restoration data for terrain.
export class TerrainRestorationDiffWriter {
  #restorations: RestorationMap | undefined;
  dirty = false;

  constructor(
    private component: ecs.ReadonlyTerrainRestorationDiff | undefined,
    eagerLoad = false
  ) {
    if (eagerLoad) {
      this.ensureRestorationsLoaded();
    }
  }

  getRestoreDataAt(
    pos: ReadonlyVec3
  ): ReadonlyTerrainRestorationEntry | undefined {
    return this.restorations.get(voxelPosToIndex(pos));
  }

  numRestorations(): number {
    return this.restorations.size;
  }

  *restorationEntries() {
    for (const e of this.restorations.values()) {
      yield { pos: voxelIndexToPos(e.position_index), ...e };
    }
  }

  setRestoration(
    delaySeconds: number,
    pos: ReadonlyVec3,
    attrs: { [K in RestorableTerrainAttributeKey]?: number | null }
  ) {
    if (RESTOREABLE_TERRAIN_ATTRIBUTES.every((k) => attrs[k] === undefined)) {
      return;
    }

    const now = secondsSinceEpoch();
    const key = voxelPosToIndex(pos);

    const entry = (() => {
      const v = this.mutableRestorations.get(key);
      if (v) {
        return v;
      } else {
        const nv = <TerrainRestorationEntry>{
          position_index: key,
          created_at: now,
          restore_time: now + delaySeconds,
        };
        this.mutableRestorations.set(key, nv);
        return nv;
      }
    })();

    let allUndefined = true;
    for (const attr of RESTOREABLE_TERRAIN_ATTRIBUTES) {
      const value = attrs[attr];
      if (value !== undefined) {
        if (value === null) {
          entry[attr] = undefined;
        } else if (entry[attr] === undefined) {
          entry[attr] = value;
        }
      }

      if (entry[attr] !== undefined) {
        allUndefined = false;
      }
    }

    // Refresh the restoration time every time restoration is updated.
    entry.restore_time = now + delaySeconds;

    // Check if the entry is empty now, in which case, clear it.
    if (allUndefined) {
      this.mutableRestorations.delete(key);
    }
  }

  clearRestoration(pos: ReadonlyVec3) {
    this.mutableRestorations.delete(voxelPosToIndex(pos));
  }

  applyRestoration(pos: ReadonlyVec3, terrainModify: RestorationTerrainSetter) {
    const occupied = terrainModify.getOccupancy(pos);
    if (occupied !== INVALID_BIOMES_ID) {
      log.error(
        `Restoring terrain at [${pos}], but it is unexepectedly occupied by id: ${occupied}`
      );
    }

    const key = voxelPosToIndex(pos);
    const entry = this.mutableRestorations.get(key);
    if (!entry) {
      log.warn(`Unexpectedly missing restoration entry at position [${pos}].`);
      return;
    }
    this.mutableRestorations.delete(key);

    terrainModify.set(pos, entry);
  }

  clear() {
    this.#restorations = undefined;
    this.dirty = false;
  }

  finish():
    | Omit<AsDelta<EntityWith<"terrain_restoration_diff">>, "id">
    | undefined {
    const restorationChange = this.changes();
    this.component = restorationChange || undefined;
    this.dirty = false;
    return restorationChange !== undefined
      ? { terrain_restoration_diff: restorationChange }
      : undefined;
  }

  private changes(): ecs.TerrainRestorationDiff | null | undefined {
    if (this.#restorations === undefined || !this.dirty) {
      return;
    }

    if (this.#restorations.size === 0) {
      return null;
    } else {
      return {
        restores: Array.from(this.restorations.values()),
      };
    }
  }

  private ensureRestorationsLoaded() {
    if (!this.#restorations) {
      this.#restorations =
        this.component === undefined
          ? new Map()
          : new Map(this.component.restores.map((r) => [r.position_index, r]));
    }
  }

  private get restorations(): ReadonlyRestorationMap {
    this.ensureRestorationsLoaded();
    return this.#restorations!;
  }

  private get mutableRestorations(): RestorationMap {
    this.ensureRestorationsLoaded();
    this.dirty = true;
    return this.#restorations!;
  }
}

const PickClass = <T, CArgs extends unknown[], K extends keyof T>(
  c: new (...args: [...CArgs]) => T,
  k: K[]
): new (...args: [...CArgs]) => Pick<T, (typeof k)[number]> => c;

export class TerrainRestorationDiffReader extends PickClass(
  TerrainRestorationDiffWriter,
  ["getRestoreDataAt", "numRestorations", "restorationEntries"]
) {
  constructor(component: ecs.ReadonlyTerrainRestorationDiff | undefined) {
    super(component, true);
  }
}

export function prioritizeRestorationEntities(
  restorations: RestorationEntity[]
) {
  // Returns the restoration with the lowest timestamp.
  const restoration = first(
    [...restorations].sort(
      (a, b) => (a.restoration.timestamp ?? 0) - (b.restoration.timestamp ?? 0)
    )
  );
  return restoration ? [restoration] : [];
}

// Allowed on blocks that restoration will restore
export const ALLOWED_TEMPORARY_BLOCK_ACTIONS: AclAction[] = [
  "destroy",
  "shape",
  "tillSoil",
];
