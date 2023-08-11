import { Replica } from "@/server/shared/replica/table";
import type { WorldApi } from "@/server/shared/world/api";
import { PlaceablesByCreatorIdSelector } from "@/shared/ecs/gen/selectors";
import { keyFromComponent } from "@/shared/ecs/key_index";

import type { Table } from "@/shared/ecs/table";
import type { RegistryLoader } from "@/shared/registry";

function getIndexConfig() {
  return {
    ...PlaceablesByCreatorIdSelector.createIndexFor.key(
      keyFromComponent("created_by", (c) => [c.id])
    ),
  };
}

export type SideFxMetaIndex = ReturnType<typeof getIndexConfig>;
export type SideFxReplica = Replica<SideFxMetaIndex>;
export type SideFxTable = Table<SideFxMetaIndex>;

export async function registerSideFxReplica<C extends { worldApi: WorldApi }>(
  loader: RegistryLoader<C>
) {
  return new Replica("sidefx", await loader.get("worldApi"), {
    metaIndex: getIndexConfig(),
  });
}
