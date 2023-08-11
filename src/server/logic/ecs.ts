import * as s from "@/shared/ecs/gen/selectors";
import { keyFromComponent } from "@/shared/ecs/key_index";
import type { Table, WriteableTable } from "@/shared/ecs/table";
import { createTable } from "@/shared/ecs/table";
import { createProtectionIndexConfig } from "@/shared/game/protection";
import { createRestorationIndexConfig } from "@/shared/game/restoration";

// Index config needed for event processing.
export function createLogicIndexConfig() {
  return {
    ...s.TerrainShardSelector.createIndexFor.spatial(),
    ...s.PresetByLabelSelector.createIndexFor.key(
      keyFromComponent("label", (c) => [c.text])
    ),
    ...createProtectionIndexConfig(),
    ...createRestorationIndexConfig(),
  };
}

export type LogicMetaIndex = ReturnType<typeof createLogicIndexConfig>;
export type LogicTable = WriteableTable & Table<LogicMetaIndex>;

export function createLogicTable(): LogicTable {
  return createTable<LogicMetaIndex>(createLogicIndexConfig());
}
