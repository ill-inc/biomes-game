import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";

const [backupFile] = process.argv.slice(2);

// Iced entities shouldn't retain any restoration data on them, it is expected
// that their restoration status will be reconsidered when they are de-iced.
migrateEntities(
  backupFile,
  (entity) => !!entity.restores_to && !!entity.iced,
  (entity) => {
    entity.clearRestoresTo();
  }
);
