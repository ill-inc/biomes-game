import { LazyReplica } from "@/server/shared/replica/lazy_table";
import type { WorldApi } from "@/server/shared/world/api";
import type { RegistryLoader } from "@/shared/registry";

export async function registerTriggerReplica<C extends { worldApi: WorldApi }>(
  loader: RegistryLoader<C>
) {
  return new LazyReplica(await loader.get("worldApi"), {
    filter: {
      anyOf: ["minigame_component", "minigame_instance", "restores_to", "team"],
    },
  });
}
