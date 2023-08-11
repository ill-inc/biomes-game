import { iterBackupEntitiesFromFile } from "@/server/backup/serde";
import { bisectBackups } from "./bisect_backups";

bisectBackups(
  new Date("2023-07-02"),
  new Date("2023-07-04"),
  async (backupFile) => {
    for await (const [_, entity] of iterBackupEntitiesFromFile(backupFile)) {
      if (entity.id === 2223719072432763) {
        if (!entity.position) {
          throw new Error("Entity has no position");
        }
        return entity.position?.v[1] < 70;
      }
    }
    return true;
  }
);
