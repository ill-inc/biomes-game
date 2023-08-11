import { changeEntities } from "@/../scripts/node/abstract_migrate_script";
import { iterBackupEntitiesFromFile } from "@/server/backup/serde";
import { Entity } from "@/shared/ecs/gen/entities";
import { BiomesId } from "@/shared/ids";

async function main() {
  const [backupFile] = process.argv.slice(2);

  console.log("Reading entire table...");
  const table = new Map<BiomesId, Entity>();
  for await (const [version, entity] of iterBackupEntitiesFromFile(
    backupFile
  )) {
    table.set(entity.id, entity);
  }
  console.log("Looking for entities to migrate...");

  changeEntities(
    backupFile,
    (entity) =>
      (!!entity.protection &&
        !!entity.deletes_with &&
        table.get(entity.deletes_with.id)?.projects_protection
          ?.protectionChildId !== entity.id) ||
      (!!entity.restoration &&
        !!entity.deletes_with &&
        table.get(entity.deletes_with.id)?.projects_protection
          ?.restorationChildId !== entity.id),
    (entity) => ({
      kind: "delete",
      id: entity.id,
    })
  );
}

main();
