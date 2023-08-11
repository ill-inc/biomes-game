import type { ClientContext, EarlyClientContext } from "@/client/game/context";
import type { OobFetcher } from "@/shared/api/oob";
import type { ReadonlyChanges } from "@/shared/ecs/change";
import { ChangeBuffer, changedBiomesId } from "@/shared/ecs/change";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { EntitySerde, SerializeForServer } from "@/shared/ecs/gen/json_serde";
import * as s from "@/shared/ecs/gen/selectors";
import { keyFromComponent } from "@/shared/ecs/key_index";
import type { TableLayers } from "@/shared/ecs/layered_table";
import { LayeredTable } from "@/shared/ecs/layered_table";
import type { EntityState, VersionedTable } from "@/shared/ecs/table";
import { MetaIndexTableImpl, VersionedTableImpl } from "@/shared/ecs/table";
import { TickVersionStamper } from "@/shared/ecs/version";
import { createProtectionIndexConfig } from "@/shared/game/protection";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { makeCvalHook } from "@/shared/util/cvals";
import { ok } from "assert";
import type { DBSchema, IDBPDatabase } from "idb/with-async-ittr";
import { openDB } from "idb/with-async-ittr";

function createClientIndexConfig() {
  return {
    ...createProtectionIndexConfig(),
    ...s.BlueprintSelector.createIndexFor.spatial(),
    ...s.CollideableSelector.createIndexFor.spatial(),
    ...s.DropSelector.createIndexFor.spatial(),
    ...s.EnvironmentGroupSelector.createIndexFor.all(),
    ...s.GremlinSelector.createIndexFor.all(),
    ...s.GroupPreviewSelector.createIndexFor.all(),
    ...s.LabelSelector.createIndexFor.key(
      keyFromComponent("label", (c) => [c.text])
    ),
    ...s.MinigameElementsSelector.createIndexFor.spatial(),
    ...s.NamedQuestGiverSelector.createIndexFor.spatial(),
    ...s.NpcMetadataSelector.createIndexFor.spatial(),
    ...s.PlaceableSelector.createIndexFor.spatial(),
    ...s.AudioSourceSelector.createIndexFor.spatial(),
    ...s.PlayerSelector.createIndexFor.spatial(),
    ...s.PositionSelector.createIndexFor.spatial(),
    ...s.RobotSelector.createIndexFor.spatial(),
    ...s.RobotsByCreatorIdSelector.createIndexFor.key(
      keyFromComponent("created_by", (c) => [c.id])
    ),
    ...s.RobotsByLandmarkNameSelector.createIndexFor.key(
      keyFromComponent("landmark", (c) =>
        c.override_name ? [c.override_name] : []
      )
    ),
    ...s.ProtectionByTeamIdSelector.createIndexFor.key(
      keyFromComponent("acl_component", (c) =>
        c.acl.creatorTeam?.[0] ? [c.acl.creatorTeam[0]] : []
      )
    ),
    ...s.RobotsThatClearSelector.createIndexFor.all(),
    ...s.TerrainShardSelector.createIndexFor.spatial(),
    ...s.RestoredPlaceableSelector.createIndexFor.spatial(),
  };
}

export type ClientMetaIndex = ReturnType<typeof createClientIndexConfig>;

class TableOobFetcher {
  constructor(
    private readonly table: VersionedTable<number>,
    private readonly oobFetcher: OobFetcher
  ) {}

  async oobFetchSingle(biomesId: BiomesId) {
    return (await this.oobFetch([biomesId]))[0];
  }

  async oobFetch(
    biomesIds: BiomesId[]
  ): Promise<Array<ReadonlyEntity | undefined>> {
    const m = await this.oobFetchAsMap(biomesIds);
    return biomesIds.map((e) => m.get(e));
  }

  async oobFetchAsMap(
    biomesIds: BiomesId[]
  ): Promise<Map<BiomesId, ReadonlyEntity>> {
    const values: Map<BiomesId, ReadonlyEntity> = new Map();
    const toFetch: BiomesId[] = [];
    for (const id of biomesIds) {
      const localCopy = this.table.get(id);
      if (localCopy) {
        values.set(id, localCopy);
      } else {
        toFetch.push(id);
      }
    }

    if (toFetch.length === 0) {
      return values;
    }

    const ret = await this.oobFetcher.fetch(toFetch);
    ok(ret.length === toFetch.length);
    for (let i = 0; i < ret.length; i++) {
      const [, entity] = ret[i];
      if (entity) {
        values.set(toFetch[i], entity);
      }
    }

    return values;
  }
}
interface ClientDbSchema extends DBSchema {
  ecs: {
    key: BiomesId;
    value: [number, any]; // Serialized entity
  };
}

class ServerTable extends VersionedTableImpl<number> {
  private useIdb = false;

  constructor(keepTombstones: boolean = false) {
    super(new TickVersionStamper(), keepTombstones);
  }

  private async withEcsDb(
    fn: (db: IDBPDatabase<ClientDbSchema>) => Promise<void>
  ) {
    if (!this.useIdb) {
      return;
    }
    try {
      let db: IDBPDatabase<ClientDbSchema> | undefined = await openDB(
        "biomes",
        1,
        {
          upgrade: (db) => {
            db.createObjectStore("ecs");
          },
          blocked: (currentVersion, blockedVersion) => {
            log.warn("IDB upgrade blocked", { currentVersion, blockedVersion });
            db?.close();
            db = undefined;
          },
          blocking: (currentVersion, blockedVersion) => {
            log.warn("IDB upgrade blocking", {
              currentVersion,
              blockedVersion,
            });
          },
        }
      );
      if (!db) {
        this.useIdb = false;
        return;
      }
      try {
        await fn(db);
        return true;
      } finally {
        db.close();
      }
    } catch (error) {
      log.error("Error in IDB transaction", { error });
      this.useIdb = false;
    }
    return false;
  }

  async bootstrap() {
    this.useIdb = true;
    await this.withEcsDb(async (db) => {
      const foundIds = new Set<BiomesId>();
      for (const [tick, entityData] of await db.getAll("ecs")) {
        if (!entityData) {
          continue;
        }
        try {
          const entity = EntitySerde.deserialize(entityData, false);
          this.load(entity.id, [tick, entity]);
          foundIds.add(entity.id);
        } catch (error) {
          log.warn("Failed to deserialize entity from IDB", { error });
          continue;
        }
      }
      for (const id of await db.getAllKeys("ecs")) {
        if (!foundIds.has(id)) {
          // Don't block on cleanup.
          void db.delete("ecs", id);
        }
      }
      log.info(`Loaded ${foundIds.size} entities from IDB`);
    });
  }

  private async updateDb(
    db: IDBPDatabase<ClientDbSchema>,
    id: BiomesId,
    tick: number,
    entity: ReadonlyEntity | undefined
  ) {
    if (!this.useIdb) {
      return;
    }
    try {
      if (entity) {
        await db.put(
          "ecs",
          [tick, EntitySerde.serialize(SerializeForServer, entity)],
          id
        );
      } else {
        await db.delete("ecs", id);
      }
    } catch (error) {
      // Note, since this is all about bootstrap, it's actually
      // safe to ignore errors here, ultimately the server will
      // just correct us on connection.
      log.warn("Failed to update IDB", { id, error });
    }
  }

  override load(id: BiomesId, state: Readonly<EntityState<number>>): boolean {
    if (super.load(id, state)) {
      void this.withEcsDb(async (db) => {
        await this.updateDb(db, id, state[0], state[1]);
      });
      return true;
    }
    return false;
  }

  override apply(changes: ReadonlyChanges) {
    const appliedChanges = super.apply(changes);
    if (!appliedChanges) {
      return undefined;
    }
    void this.withEcsDb(async (db) => {
      for (const change of changes) {
        const id = changedBiomesId(change);
        await this.updateDb(db, id, ...this.getWithVersion(id));
      }
    });
    return appliedChanges;
  }
}

export class ClientTable extends MetaIndexTableImpl<number, ClientMetaIndex> {
  layers: TableLayers;
  oob: TableOobFetcher;

  constructor(
    oobFetcher: OobFetcher,
    layeredTable: LayeredTable<number>,
    indexConfig: ClientMetaIndex
  ) {
    super(layeredTable, indexConfig);
    this.oob = new TableOobFetcher(this, oobFetcher);
    this.layers = layeredTable;
  }
}

export async function registerChangeBuffer(): Promise<ChangeBuffer> {
  return new ChangeBuffer();
}

export async function registerServerTable(
  loader: RegistryLoader<EarlyClientContext>
) {
  const config = await loader.get("clientConfig");

  const table = new ServerTable();
  if (config.useIdbForEcs) {
    await table.bootstrap();
  }

  return table;
}

export async function registerEarlyTable(
  loader: RegistryLoader<EarlyClientContext>
) {
  const [oobFetcher, serverTable] = await Promise.all([
    loader.get("oobFetcher"),
    loader.get("serverTable"),
  ]);

  // Create the client's ECS table, sourced directly from server data.
  const layeredTable = new LayeredTable(serverTable);

  // Create the client metaindex table.
  const indexConfig = createClientIndexConfig();
  const table = new ClientTable(oobFetcher, layeredTable, indexConfig);

  for (const [name, index] of Object.entries(indexConfig)) {
    makeCvalHook({
      path: ["game", "indexes", name],
      help: `Size of the ${name} index`,
      collect: () => index.size,
    });
  }
  makeCvalHook({
    path: ["game", "table"],
    help: `Size of the base client table`,
    collect: () => table.recordSize,
  });

  return table;
}

export async function registerTable(loader: RegistryLoader<ClientContext>) {
  const [serverTable, earlyTable, initialState, changeBuffer, userId, io] =
    await Promise.all([
      loader.get("serverTable"),
      loader.get("earlyTable"),
      loader.get("initialState"),
      loader.get("changeBuffer"),
      loader.get("userId"),
      loader.get("io"),
    ]);
  // Apply the initial state to the game
  serverTable.apply(initialState.changes);
  changeBuffer.push(initialState.changes);
  initialState.changes.length = 0;
  if (io.syncTarget.kind === "localUser") {
    ok(
      serverTable.get(userId) !== undefined,
      "Initial state missing current user."
    );
  }

  return earlyTable;
}
