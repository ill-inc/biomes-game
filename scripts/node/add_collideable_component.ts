import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";

const [backupFile] = process.argv.slice(2);

// Upon introduction of the "collideable" component, this script will add it to
// all the entities that should have it (placeables, NPCs, players).
migrateEntities(
  backupFile,
  (entity) =>
    (!!entity.placeable_component ||
      !!entity.npc_metadata ||
      !!entity.remote_connection ||
      !!entity.blueprint_component) &&
    !entity.collideable,
  (entity) => {
    entity.setCollideable();
  }
);
