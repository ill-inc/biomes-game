import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import { BiomesId } from "@/shared/ids";

const placeableIdsToBeDeleted: BiomesId[] = [
  7301681837913214 as BiomesId,
  5893854733832257 as BiomesId,
];
const [backupFile] = process.argv.slice(2);
migrateEntities(
  backupFile,
  (entity) =>
    !!entity.placeable_component &&
    placeableIdsToBeDeleted.includes(entity.placeable_component.item_id) &&
    !entity.restores_to,
  (entity) => {
    entity.setRestoresTo({
      restore_to_state: "deleted",
      trigger_at: 0,
      expire: true,
    });
  }
);
