import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import {
  deserializeNpcCustomState,
  serializeNpcCustomState,
} from "@/shared/npc/serde";

const [backupFile] = process.argv.slice(2);

// Manually reset the state of NPCs with a bad state.
migrateEntities(
  backupFile,
  (entity) => {
    if (!entity.npc_state) {
      return false;
    }
    try {
      deserializeNpcCustomState(entity.npc_state.data, {
        propagateParseError: true,
      });
    } catch (error) {
      return true;
    }
    return false;
  },
  (entity) => {
    entity.setNpcState({
      data: serializeNpcCustomState(deserializeNpcCustomState(undefined)),
    });
  }
);
