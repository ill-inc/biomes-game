import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";

// Script that just re-runs getNpcSize on all of them.
const [backupFile] = process.argv.slice(2);
migrateEntities(
  backupFile,
  (entity) =>
    Boolean(
      entity.robot_component &&
        ((entity.projects_protection &&
          entity.projects_protection.snapToGrid !== 32) ||
          (entity.unmuck && entity.unmuck.snapToGrid !== 32))
    ),
  (entity) => {
    if (entity.projectsProtection()) {
      entity.mutableProjectsProtection().snapToGrid = 32;
    }
    if (entity.unmuck()) {
      entity.mutableUnmuck().snapToGrid = 32;
    }
  }
);
