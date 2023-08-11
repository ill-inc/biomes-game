import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import { BikkieIds } from "@/shared/bikkie/ids";

const [backupFile] = process.argv.slice(2);

migrateEntities(
  backupFile,
  (entity) =>
    entity.placeable_component !== undefined &&
    entity.placeable_component.item_id === BikkieIds.campfire &&
    entity.irradiance === undefined,
  (entity) => {
    entity.mutableIrradiance().color = [255, 119, 13];
    entity.mutableIrradiance().intensity = 15;
  }
);
