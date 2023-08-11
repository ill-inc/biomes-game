import type { Change } from "@/shared/ecs/change";
import {
  COMPONENT_ID_TO_PROP_NAME,
  type ComponentName,
} from "@/shared/ecs/gen/entities";
import type { Table } from "@/shared/ecs/table";
import type { BiomesId } from "@/shared/ids";
import { MultiMap } from "@/shared/util/collections";
import { assertNever } from "@/shared/util/type_helpers";
import { z } from "zod";

export interface VersionStamper<TVersion> {
  readonly zero: TVersion;
  createFor(tick: number): TVersion;
  tickFor(version: TVersion): number;
  isAhead(existing: TVersion, version: TVersion | number): boolean;
  isAtOrAhead(existing: TVersion, version: TVersion | number): boolean;
  update(existing: TVersion | undefined, change: Change): TVersion;
}

export class TickVersionStamper implements VersionStamper<number> {
  public readonly zero = 0;

  createFor(tick: number): number {
    return tick;
  }

  tickFor(version: number): number {
    return version;
  }

  isAhead(existing: number, version: number): boolean {
    return existing > version;
  }

  isAtOrAhead(existing: number, version: number): boolean {
    return existing >= version;
  }

  update(existing: number | undefined, change: Change): number {
    return Math.max(existing ?? 0, change.tick);
  }
}

export type ComponentVersions = {
  [key in ComponentName]: number;
};

export function allComponentsAtTick(tick: number): ComponentVersions {
  const versions: Partial<ComponentVersions> = {};
  for (const key of COMPONENT_ID_TO_PROP_NAME) {
    if (key !== undefined) {
      versions[key] = tick;
    }
  }
  return versions as ComponentVersions;
}
export class EntityVersion {
  constructor(
    public tick: number,
    public tickByComponent?: ComponentVersions
  ) {}

  updateWith(change: Change) {
    switch (change.kind) {
      case "delete":
        this.tick = change.tick;
        this.tickByComponent = undefined;
        break;
      case "create":
        this.tick = change.tick;
        this.tickByComponent = undefined;
        break;
      case "update":
        {
          const componentVersions: Partial<ComponentVersions> =
            this.tickByComponent ?? allComponentsAtTick(this.tick);
          for (const key in change.entity) {
            if (key === "id") {
              continue;
            }
            componentVersions[key as ComponentName] = change.tick;
          }
          this.tick = change.tick;
          this.tickByComponent = componentVersions as ComponentVersions;
        }
        break;
      default:
        assertNever(change);
    }
  }
}

export class EntityVersionStamper implements VersionStamper<EntityVersion> {
  public readonly zero = new EntityVersion(0);

  createFor(tick: number): EntityVersion {
    return new EntityVersion(tick);
  }

  tickFor(version: EntityVersion): number {
    return version.tick;
  }

  isAhead(existing: EntityVersion, version: number | EntityVersion): boolean {
    return (
      existing.tick > (typeof version === "number" ? version : version.tick)
    );
  }

  isAtOrAhead(
    existing: EntityVersion,
    version: number | EntityVersion
  ): boolean {
    return (
      existing.tick >= (typeof version === "number" ? version : version.tick)
    );
  }

  update(existing: EntityVersion | undefined, change: Change): EntityVersion {
    if (existing === undefined) {
      return new EntityVersion(change.tick);
    }
    existing.updateWith(change);
    return existing;
  }
}

export type VersionMap = Map<BiomesId, number>;

export const zEncodedVersionMap = z.number().array();
export type EncodedVersionMap = z.infer<typeof zEncodedVersionMap>;

export function decodeVersionMap(encoded?: EncodedVersionMap): VersionMap {
  if (!encoded) {
    return new Map();
  }
  const map = new Map<BiomesId, number>();
  let tick = 0;
  let last: BiomesId | undefined;
  for (const tickOrId of encoded) {
    if (tickOrId < 0) {
      tick = -tickOrId;
      last = undefined;
    } else {
      const id = (last === undefined ? tickOrId : last + tickOrId) as BiomesId;
      map.set(id, tick);
      last = id;
    }
  }
  return map;
}

function encodeTickMap(tickToIds: MultiMap<number, BiomesId>): number[] {
  const encoded: number[] = [];
  for (const [tick, ids] of tickToIds) {
    encoded.push(-tick);
    ids.sort((a, b) => a - b);
    let last: BiomesId | undefined;
    for (const id of ids) {
      if (last === undefined) {
        encoded.push(id);
        last = id;
      } else {
        encoded.push(id - last);
        last = id;
      }
    }
  }
  return encoded;
}

export function encodeVersionMap(
  entityVersions: Map<BiomesId, number>
): EncodedVersionMap {
  const tickToIds = new MultiMap<number, BiomesId>();
  for (const [id, tick] of entityVersions) {
    tickToIds.add(tick, id);
  }
  return encodeTickMap(tickToIds);
}

export function versionMapFromTable(table: Table<{}>) {
  const tickToIds = new MultiMap<number, BiomesId>();
  for (const [id, state] of table.deltaSince()) {
    if (state[1] === undefined) {
      // We don't consider tombstones.
      continue;
    }
    const tick = state[0];
    tickToIds.add(tick, id);
  }
  return encodeTickMap(tickToIds);
}
