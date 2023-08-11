import type { Replica } from "@/server/shared/replica/table";
import { ChangeBuffer } from "@/shared/ecs/change";
import type {
  EcsResourceMetaIndex,
  IndexedEcsResourcePaths,
} from "@/shared/game/ecs_indexed_resources";
import { getIndexedResources } from "@/shared/game/ecs_indexed_resources";
import type { EcsResourcePaths } from "@/shared/game/ecs_resources";
import { addTableResources } from "@/shared/game/ecs_resources";
import type { BiomesResourcesBuilder } from "@/shared/resources/biomes";

export function bufferedTableApply(replica: Replica<EcsResourceMetaIndex>) {
  const changeBuffer = new ChangeBuffer();
  replica.apply = (changes) => changeBuffer.push(changes);

  return () => {
    const changes = changeBuffer.pop();

    replica.table.apply(changes);

    return changes;
  };
}

export function addReplicaBackedEcsResources(
  replica: Replica<EcsResourceMetaIndex>,
  builder: BiomesResourcesBuilder<IndexedEcsResourcePaths & EcsResourcePaths>
) {
  const indexedResources = getIndexedResources(replica.table);
  for (const indexedResource of indexedResources) {
    indexedResource.add(builder);
  }
  addTableResources(replica.table, builder);
  return indexedResources;
}
