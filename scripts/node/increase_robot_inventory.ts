import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import { ROBOT_ITEM_SLOTS } from "@/shared/constants";

const [backupFile] = process.argv.slice(2);

migrateEntities(
  backupFile,
  (entity) =>
    entity.robot_component !== undefined &&
    entity.container_inventory !== undefined,
  (entity) => {
    while (entity.containerInventory()!.items.length < ROBOT_ITEM_SLOTS) {
      entity.mutableContainerInventory().items.push(undefined);
    }
  }
);
