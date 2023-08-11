import { changeEntities } from "@/../scripts/node/abstract_migrate_script";
import { iterBackupEntitiesFromFile } from "@/server/backup/serde";
import { BiomesId } from "@/shared/ids";

async function main() {
  const [backupFile] = process.argv.slice(2);

  console.log("Reading entire table...");
  const spleefGames = new Set<BiomesId>();
  const referencedElements = new Set<BiomesId>();
  for await (const [_, entity] of iterBackupEntitiesFromFile(backupFile)) {
    if (entity.minigame_component) {
      for (const elementId of entity.minigame_component.minigame_element_ids) {
        referencedElements.add(elementId);
      }
      if (entity.minigame_component.metadata.kind === "spleef") {
        spleefGames.add(entity.id);
      }
    }
    if (entity.minigame_instance && !entity.iced) {
      for (const elementId of entity.minigame_instance.instance_element_ids) {
        referencedElements.add(elementId);
      }
    }
  }
  console.log("Looking for entities to migrate...");

  changeEntities(
    backupFile,
    (entity) =>
      Boolean(entity.minigame_instance && entity.iced) ||
      Boolean(
        entity.minigame_element &&
          spleefGames.has(entity.minigame_element.minigame_id) &&
          !referencedElements.has(entity.id) &&
          entity.iced
      ),
    (entity) => ({
      kind: "delete",
      id: entity.id,
    })
  );
}

main();
