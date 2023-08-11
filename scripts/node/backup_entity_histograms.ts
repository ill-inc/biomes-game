import { iterBackupEntitiesFromFile } from "@/server/backup/serde";
import { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { DefaultMap } from "@/shared/util/collections";

// Returns a histogram of number of entities with each different component
// variation.
async function backupEntityHistogram(
  backupFile: string, filter: (e: ReadonlyEntity) => boolean
) {
  const histogram = new DefaultMap<string, number>(() => 0);

  for await (const [_, entity] of iterBackupEntitiesFromFile(backupFile)) {
    if (filter(entity)) {
      const key = componentsKey(entity);
      const count = histogram.get(key);
      histogram.set(key, count + 1);
    }
  }

  return histogram;
}

function printHistogram(histogram: Map<string, number>) {
  const sorted = Array.from(histogram.entries()).sort((a, b) => b[1] - a[1]);
  for (const [components, count] of sorted) {
    console.log(`${count}: ${components}`);
  }
}

function componentsKey(entity: ReadonlyEntity) {
  return Object.keys(entity).filter((k) => k !== "id").sort().join(",");
}

async function printBackupEntityHistogram(
  backupFile: string, filter: (e: ReadonlyEntity) => boolean) {
  const histogram = await backupEntityHistogram(backupFile, filter)
  printHistogram(histogram);
}

const [backupFile] = process.argv.slice(2);

printBackupEntityHistogram(backupFile, (e) => !!e.position)
