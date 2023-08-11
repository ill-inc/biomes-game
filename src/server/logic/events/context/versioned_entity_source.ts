import type { LogicMetaIndex } from "@/server/logic/ecs";
import type {
  QueryKeyType,
  QuerySpecialization,
  ReadonlyEntitySource,
} from "@/server/logic/events/query";
import { ByKey } from "@/server/logic/events/query";
import { PatchableEntity } from "@/shared/ecs/gen/delta";
import { Entity } from "@/shared/ecs/gen/entities";
import {
  PresetByLabelSelector,
  TerrainShardSelector,
} from "@/shared/ecs/gen/selectors";
import type { ReadonlyAclDomain } from "@/shared/ecs/gen/types";
import type { Table } from "@/shared/ecs/table";
import type { AclEntities } from "@/shared/game/acls";
import { aclEntitiesForDomain } from "@/shared/game/acls";
import { getRestorationEntitiesForDomain } from "@/shared/game/restoration";
import { Terrain } from "@/shared/game/terrain/terrain";
import type { BiomesId } from "@/shared/ids";
import { assertNever } from "@/shared/util/type_helpers";
import type { VoxelooModule } from "@/shared/wasm/types";
import { ok } from "assert";

// Entity source capable of fetching versions, also records the terrain helpers
// created to avoid creating distinct ones.
export class VersionedEntitySource<TTable extends Table<any>> {
  private readonly fetchedEntities = new Map<
    BiomesId,
    readonly [number, PatchableEntity]
  >();
  private readonly fetchedTerrain = new Map<
    BiomesId,
    readonly [number, Terrain]
  >();
  private readonly deletedIds = new Set<BiomesId>();

  constructor(
    private readonly voxeloo: VoxelooModule,
    protected readonly table: TTable,
    private readonly enforcedSpecializations: QuerySpecialization[] = []
  ) {}

  resolveIndexLookup(_id: ByKey<QueryKeyType>): BiomesId | undefined {
    return undefined;
  }

  asReadonly(): ReadonlyEntitySource {
    return {
      get: (id) => {
        if (id instanceof ByKey) {
          const indexMatch = this.resolveIndexLookup(id);
          if (indexMatch === undefined) {
            return;
          }
          id = indexMatch;
        }
        return this.table.get(id);
      },
    };
  }

  delete(id: BiomesId): void {
    this.deletedIds.add(id);
  }

  private getTerrain(id: BiomesId): readonly [number, Terrain | undefined] {
    const terrain = this.fetchedTerrain.get(id);
    if (terrain) {
      return terrain as [number, Terrain];
    }
    const [version, match] = this.table.getWithVersion(id);
    if (match === undefined) {
      return [0, undefined];
    }
    ok(
      Entity.has(match, ...TerrainShardSelector.components),
      "Cannot request non-terrain entities with 'terrain' specialization"
    );
    const result = [version, new Terrain(this.voxeloo, match)] as const;
    this.fetchedTerrain.set(id, result);
    return result as unknown as [number, Terrain];
  }

  get<TSpecialization extends QuerySpecialization>(
    specialization: TSpecialization,
    id: BiomesId | ByKey<QueryKeyType>
  ): readonly [
    number,
    (TSpecialization extends "terrain" ? Terrain : PatchableEntity) | undefined
  ] {
    if (id instanceof ByKey) {
      const indexMatch = this.resolveIndexLookup(id);
      if (indexMatch === undefined) {
        return [0, undefined];
      }
      id = indexMatch;
    }

    if (this.deletedIds.has(id)) {
      return [0, undefined];
    }

    type TResult = TSpecialization extends "terrain"
      ? Terrain
      : PatchableEntity;
    if (specialization === "terrain") {
      return this.getTerrain(id) as [number, TResult];
    }

    const entity = this.fetchedEntities.get(id);
    if (entity) {
      return entity as unknown as [number, TResult];
    }

    const [version, match] = this.table.getWithVersion(id);
    if (match === undefined) {
      return [0, undefined];
    }
    for (const specialization of this.enforcedSpecializations) {
      switch (specialization) {
        case "terrain":
          ok(
            !match.shard_seed,
            "Cannot request terrain entities as anything other than 'terrain'"
          );
          break;
        case "player":
          ok(
            specialization === "player" || !match.remote_connection,
            "Cannot request players as anything other than 'player'"
          );
          break;
      }
    }

    const result = [version, new PatchableEntity(match)] as const;
    this.fetchedEntities.set(id, result);
    return result as unknown as [number, TResult];
  }
}

export class LogicVersionedEntitySource extends VersionedEntitySource<
  Table<LogicMetaIndex>
> {
  constructor(voxeloo: VoxelooModule, table: Table<LogicMetaIndex>) {
    super(voxeloo, table, ["terrain"]);
  }

  resolveIndexLookup(id: ByKey<QueryKeyType>): BiomesId | undefined {
    // TODO: Better support this.
    switch (id.keyType) {
      case "terrainByShardId":
        return this.table.get(TerrainShardSelector.query.key(id.key))?.id;
      case "presetByLabel":
        return this.table.get(PresetByLabelSelector.query.key(id.key))?.id;
      default:
        assertNever(id.keyType);
    }
  }

  aclEntitiesForDomain(domain: ReadonlyAclDomain): AclEntities {
    return aclEntitiesForDomain(domain, this.table);
  }

  restorationEntitiesForDomain(domain: ReadonlyAclDomain) {
    return getRestorationEntitiesForDomain(domain, this.table);
  }
}
