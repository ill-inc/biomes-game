import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import { ROBOT_ITEM_SLOTS } from "@/shared/constants";

const [backupFile] = process.argv.slice(2);

migrateEntities(
  backupFile,
  (entity) =>
    entity.robot_component !== undefined &&
    entity.container_inventory === undefined,
  (entity) => {
    entity.mutableContainerInventory().items = new Array(ROBOT_ITEM_SLOTS);
  }
);
