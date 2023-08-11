import { iterBackupEntitiesFromFile } from "@/server/backup/serde";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import type { MetaIndex } from "@/shared/ecs/selectors/selector";
import type { Table } from "@/shared/ecs/table";
import { EntityStats } from "@/shared/stats";
import { stat } from "fs/promises";

export async function getBackupStats(
  entities: AsyncGenerator<ReadonlyEntity, void, unknown>
) {
  const stats = new EntityStats();
  for await (const entity of entities) {
    stats.observe(entity);
  }
  stats.finalize();
  return stats;
}

export async function* backupFileToEntityStream(backupFile: string) {
  for await (const [_version, entity] of iterBackupEntitiesFromFile(
    backupFile
  )) {
    yield entity;
  }
}

export async function getBackupStatsFromFile(
  backupFile: string
): Promise<EntityStats> {
  const stats = await getBackupStats(backupFileToEntityStream(backupFile));
  stats.totalFileSize = (await stat(backupFile)).size;
  return stats;
}

async function* tableToEntityStream(table: Table<MetaIndex<unknown>>) {
  for (const [, [_version, entity]] of table.deltaSince()) {
    yield entity;
  }
}

export async function getBackupStatsFromTable(
  table: Table<MetaIndex<unknown>>
): Promise<EntityStats> {
  return getBackupStats(tableToEntityStream(table));
}
