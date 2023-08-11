import { changeEntities } from "@/../scripts/node/abstract_migrate_script";

const [backupFile] = process.argv.slice(2);


changeEntities(
  backupFile,
  (entity) =>
    Object.keys(entity).length === 5 &&
      !!entity.npc_state &&
      !!entity.orientation &&
      !!entity.rigid_body &&
      !!entity.position,
  (entity) => ({
    kind: "delete",
    id: entity.id,
  })
);
