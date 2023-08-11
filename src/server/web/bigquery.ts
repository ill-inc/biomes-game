import { BackgroundTaskController } from "@/shared/abort";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { sleep } from "@/shared/util/async";
import type { Table } from "@google-cloud/bigquery";
import { BigQuery } from "@google-cloud/bigquery";

export interface Row {
  timestamp?: number;
  userId?: BiomesId;
  json: unknown;
}

export interface RowSchema {
  timestamp: number;
  userId?: BiomesId;
  data: string; // stringified JSON
}

export interface TableConfig {
  datasetName: string;
  tableName: string;
  batchSize?: number;
}

// Keeps track of context for an open table, as well as a timer to collect and
// batch inserted rows together.
export interface TableConnection {
  readonly pendingSize: number;
  insert: (row: Row) => void;
}

class TableConnectionImpl {
  private readonly controller = new BackgroundTaskController();
  private readonly table: Table;
  private readonly pending: RowSchema[] = [];
  private readonly batchSize: number;

  constructor(
    bigQuery: BigQuery,
    { datasetName, tableName, batchSize }: TableConfig
  ) {
    this.table = bigQuery.dataset(datasetName).table(tableName);
    this.batchSize = batchSize ?? CONFIG.bigQueryDefaultBatchSize;
    this.controller.runInBackground("upload", (signal) =>
      this.periodicallyUploadRows(signal)
    );
  }

  get pendingSize() {
    return this.pending.length;
  }

  private async periodicallyUploadRows(signal: AbortSignal) {
    while (await sleep(CONFIG.bigQueryFlushIntervalMs, signal)) {
      try {
        await this.uploadRows();
      } catch (error) {
        log.error("Error loading data into BigQuery", { error });
      }
    }
  }

  private async uploadRowBatch() {
    const rows = this.pending.splice(0, this.batchSize);
    if (rows.length === 0) {
      return;
    }
    try {
      await this.table.insert(rows);
    } catch (error) {
      this.pending.push(...rows);
      throw error;
    }
  }

  private async uploadRows() {
    while (this.pending.length > 0) {
      await this.uploadRowBatch();
    }
  }

  insert(row: Row) {
    this.pending.push({
      timestamp: row.timestamp ?? Date.now() / 1000,
      ...(row.userId ? { userId: row.userId } : {}),
      data: JSON.stringify(row.json, (_key, value) =>
        typeof value === "bigint" ? value.toString() + "n" : value
      ),
    });
  }

  async stop() {
    while (this.pending.length > 0) {
      try {
        await this.uploadRows();
      } catch (error) {
        log.error("BigQuery shutdown delayed by pending data", { error });
      }
    }
    await this.controller.abortAndWait();
  }
}

export class BigQueryConnection {
  private readonly tables: Map<string, TableConnectionImpl> = new Map();
  private bigQuery?: BigQuery;

  constructor() {
    // We use the "legacy streaming API" because the node client supports JSON
    // input, as opposed to protobuf for the new BigQuery Storage Write API.
    // This page does a good job of describing the difference:
    //   https://cloud.google.com/blog/topics/developers-practitioners/bigquery-write-api-explained-overview-write-api
    // But essentially, we don't get guaranteed write once, and it costs more.
    // If these things matter more in the future, e.g. because volume increases,
    // we can look at switching.
    this.bigQuery = new BigQuery();
  }

  // Returns an interface enabling rows of data to be pushed to a table. The
  // rows will be queued, and a timer will take care of periodically flushing
  // all queued rows. The tables are cached as well, so e.g. web requests
  // can re-request the same table each time without re-initializing it.
  getTable(config: TableConfig): TableConnection {
    if (!this.bigQuery) {
      throw Error("There was an error initializing the BigTable connection.");
    }

    const { datasetName, tableName } = config;

    const tableKey = `${datasetName}.${tableName}`;
    const existingTable = this.tables.get(tableKey);
    if (existingTable) {
      return existingTable;
    }

    // The table doesn't exist yet, so create a new connection to it.
    const newTable = new TableConnectionImpl(this.bigQuery, config);
    this.tables.set(tableKey, newTable);
    return newTable;
  }

  // Closes all connections to BigQuery, and waits for all pending rows to be
  // flushed.
  async stop() {
    this.bigQuery = undefined;
    const tablePromises = [...this.tables.values()].map((table) =>
      table.stop()
    );
    this.tables.clear();
    await Promise.all(tablePromises);
  }
}

export async function registerBigQueryClient<C extends {}>(
  _loader: RegistryLoader<C>
) {
  return new BigQueryConnection();
}
