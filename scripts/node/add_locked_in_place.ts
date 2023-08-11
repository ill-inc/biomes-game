import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";

const [backupFile] = process.argv.slice(2);

migrateEntities(
  backupFile,
  (entity) =>
    entity.robot_component !== undefined &&
    entity.locked_in_place === undefined,
  (entity) => {
    entity.setLockedInPlace();
  }
);

migrateEntities(
  backupFile,
  (entity) =>
    entity.placeable_component !== undefined &&
    entity.locked_in_place === undefined,
  (entity) => {
    entity.setLockedInPlace();
  }
);
