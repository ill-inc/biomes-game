import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import { sizeForPlacable } from "@/server/logic/utils/placeables";
import { isEqual } from "lodash";

// Script that just re-runs getNpcSize on all of them.
const [backupFile] = process.argv.slice(2);
migrateEntities(
  backupFile,
  (entity) => !!(entity.placeable_component && !entity.size),
  (entity) => {
    const oldSize = entity.size();
    const newSize = sizeForPlacable(
      entity.placeableComponent()!.item_id,
      entity.position()?.v
    );
    if (!newSize || isEqual(oldSize, newSize)) {
      return;
    }
    entity.setSize(newSize);
  }
);
