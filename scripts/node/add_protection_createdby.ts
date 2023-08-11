import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import { CreatedBy } from "@/shared/ecs/gen/components";

const [backupFile] = process.argv.slice(2);

migrateEntities(
  backupFile,
  (entity) =>
    entity.deletes_with !== undefined && entity.created_by?.id === undefined,
  (entity) => {
    entity.setCreatedBy(
      CreatedBy.create({
        id: entity.deletesWith()!.id,
        created_at:
          entity.protection()?.timestamp ?? entity.restoration()?.timestamp,
      })
    );
  }
);
