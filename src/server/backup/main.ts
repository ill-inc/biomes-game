import { drainContents } from "@/server/backup/serde";
import { getBackupStatsFromTable } from "@/server/backup/stats";
import type { SharedServerContext } from "@/server/shared/context";
import { sharedServerContext } from "@/server/shared/context";
import { runServer } from "@/server/shared/main";
import { materializeEcs } from "@/server/shared/replica/table";
import { registerBaseServerConfig } from "@/server/shared/server_config";
import { registerBiomesStorage } from "@/server/shared/storage";
import { registerWorldApi } from "@/server/shared/world/register";
import type { BigQueryConnection } from "@/server/web/bigquery";
import { registerBigQueryClient } from "@/server/web/bigquery";
import { getStorageBucketInstance } from "@/server/web/cloud_storage/cloud_storage";
import { getAllUsers } from "@/server/web/db/users_fetch";
import { BackgroundTaskController } from "@/shared/abort";
import { PlayerSelector } from "@/shared/ecs/gen/selectors";
import type { Table } from "@/shared/ecs/table";
import { makeJsonSafe } from "@/shared/json";
import { log } from "@/shared/logging";
import { RegistryBuilder } from "@/shared/registry";
import { sleep } from "@/shared/util/async";
import { ok } from "assert";

function createIndexConfig() {
  return {
    ...PlayerSelector.createIndexFor.all(),
  };
}

type BackupTable = Table<ReturnType<typeof createIndexConfig>>;

interface BackupServerContext extends SharedServerContext {
  bigQuery: BigQueryConnection;
  table: BackupTable;
}

function formatPath(now: Date) {
  return `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
}

function formatFilename(now: Date) {
  return `biomes-${now.toISOString()}.json`;
}

async function writeFullBackup(
  { table }: BackupServerContext,
  signal: AbortSignal
) {
  const now = new Date();
  const backupPath = `${
    process.env.NODE_ENV === "production" ? "world" : "dev-world"
  }/${formatPath(now)}/${formatFilename(now)}`;

  const instance = getStorageBucketInstance("biomes-backup");
  ok(instance);
  const stream = instance.file(backupPath).createWriteStream({
    contentType: "application/json",
    validation: false,
  });
  log.info(
    `Writing backup of ${table.recordSize} entities to ${backupPath}...`
  );
  const [completed] = await Promise.all([
    drainContents(table, stream, signal),
    new Promise<void>((resolve, reject) => {
      stream.on("error", reject);
      stream.on("finish", resolve);
    }),
  ]);
  if (completed) {
    log.info("Backup complete.", {
      entities: table.recordSize,
      path: backupPath,
    });
  } else {
    log.info("Backup interrupted.", {
      path: backupPath,
    });
  }
}

async function writeEcsUsers(
  { table, bigQuery }: BackupServerContext,
  signal: AbortSignal
) {
  const bqTable = bigQuery.getTable({
    datasetName: "prod",
    tableName: "ecs_users",
    batchSize: 50,
  });
  const timestamp = Date.now() / 1000;
  for (const player of table.scan(PlayerSelector.query.all())) {
    if (signal.aborted) {
      break;
    }
    bqTable.insert({
      userId: player.id,
      json: makeJsonSafe(player),
      timestamp,
    });
  }
}

async function writeFirestoreUsers(
  { db, bigQuery }: BackupServerContext,
  signal: AbortSignal
) {
  const bqTable = bigQuery.getTable({
    datasetName: "prod",
    tableName: "users",
    batchSize: 50,
  });
  let start = 0;
  const pageSize = 100;
  const timestamp = Date.now() / 1000;
  while (!signal.aborted) {
    const batch = await getAllUsers(db, start, pageSize, undefined, true);
    if (batch.length === 0) {
      break;
    }
    for (const user of batch) {
      bqTable.insert({
        userId: user.id,
        json: makeJsonSafe(user),
        timestamp,
      });
    }
    start += batch.length;
  }
}

async function writeFirestoreUserAuthLinks(
  { db, bigQuery }: BackupServerContext,
  signal: AbortSignal
) {
  const bqTable = bigQuery.getTable({
    datasetName: "prod",
    tableName: "user_auth_links",
    batchSize: 50,
  });
  const baseQuery = db.collection("user-auth-links").limit(100);
  let query = baseQuery;
  const timestamp = Date.now() / 1000;
  while (!signal.aborted) {
    const batch = await query.get();
    if (batch.docs.length === 0) {
      break;
    }
    for (const link of batch.docs) {
      bqTable.insert({
        userId: link.data().userId,
        json: makeJsonSafe(link.data()),
        timestamp,
      });
    }
    query = baseQuery.startAfter(batch.docs[batch.docs.length - 1]);
  }
}

async function writeBackupStats(
  { bigQuery, table }: BackupServerContext,
  _signal: AbortSignal
) {
  const stats = await getBackupStatsFromTable(table);

  const timestamp = Date.now() / 1000;
  const componentRowEntries = Array.from(
    stats.componentStatistics.entries(),
    ([name, s]) => ({
      timestamp,
      json: makeJsonSafe({
        name,
        count: s.count,
        size: s.size,
        min: s.min,
        max: s.max,
        stddev: s.stddev,
      }),
    })
  );

  const bqTable = bigQuery.getTable({
    datasetName: "prod",
    tableName: "ecs_component_stats",
  });

  for (const componentRowEntry of componentRowEntries) {
    bqTable.insert(componentRowEntry);
  }
}

export async function runBackupTasks(
  signal: AbortSignal,
  context: BackupServerContext,
  gracefulShutdown: () => void
) {
  await Promise.all([
    writeFullBackup(context, signal),
    writeEcsUsers(context, signal),
    writeFirestoreUsers(context, signal),
    writeFirestoreUserAuthLinks(context, signal),
    writeBackupStats(context, signal),
  ]);
  await sleep(500, signal);
  gracefulShutdown();
}

void runServer(
  "backup",
  (signal) => {
    const worldApiFactory = registerWorldApi<BackupServerContext>({ signal });
    return new RegistryBuilder<BackupServerContext>()
      .install(sharedServerContext)
      .bind("config", registerBaseServerConfig)
      .bind("db", registerBiomesStorage)
      .bind("bigQuery", registerBigQueryClient)
      .bind("table", async (loader) => {
        const worldApi = await worldApiFactory(loader);
        const table = await materializeEcs("backup", worldApi, {
          metaIndex: createIndexConfig(),
        });
        worldApi.stop().catch((error) => {
          log.error("Could not stop WorldApi", { error });
        });
        return table;
      })
      .build();
  },
  async (context, _signal, gracefulShutdown) => {
    const controller = new BackgroundTaskController();
    controller.runInBackground("backup", (signal) =>
      runBackupTasks(signal, context, gracefulShutdown)
    );
    return {
      shutdownHook: () => controller.abortAndWait(),
    };
  }
);
