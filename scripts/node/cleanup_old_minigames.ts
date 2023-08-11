import {
  migrateEntities,
  scanEntities,
} from "@/../scripts/node/abstract_migrate_script";
import { BiomesId } from "@/shared/ids";

const [backupFile] = process.argv.slice(2);

async function main() {
  const referencedInstances = new Set<BiomesId>();
  await scanEntities(backupFile, (entity) => {
    if (entity.playing_minigame) {
      referencedInstances.add(entity.playing_minigame.minigame_instance_id);
    }
    if (entity.minigame_component) {
      for (const active of entity.minigame_component.active_instance_ids) {
        referencedInstances.add(active);
      }
    }
  });

  // Delete any minigame instances that are not referenced.
  await migrateEntities(
    backupFile,
    (entity) =>
      Boolean(entity.minigame_instance && !referencedInstances.has(entity.id)),
    () => "delete"
  );
}

main();
