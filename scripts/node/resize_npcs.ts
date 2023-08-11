import { migrateEntities } from "@/../scripts/node/abstract_migrate_script";
import { getNpcSize } from "@/server/spawn/spawn_npc";
import { Size } from "@/shared/ecs/gen/components";
import { idToNpcType, isNpcTypeId } from "@/shared/npc/bikkie";
import { isEqual } from "lodash";

// Script that just re-runs getNpcSize on all of them.
const [backupFile] = process.argv.slice(2);
migrateEntities(
  backupFile,
  (entity) => !!entity.npc_metadata?.type_id,
  (entity) => {
    const npcTypeId = entity.npcMetadata()?.type_id;
    if (!npcTypeId || !isNpcTypeId(npcTypeId)) {
      return;
    }
    const npcType = idToNpcType(npcTypeId);
    if (npcType.behavior?.sizeVariation) {
      return;
    }

    const oldSize = entity.size()?.v;
    const newSize = getNpcSize(npcType);
    if (isEqual(oldSize, newSize)) {
      return;
    }
    entity.setSize(Size.create({ v: newSize }));
  }
);
