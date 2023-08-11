import type { IdGenerator } from "@/server/shared/ids/generator";
import { IdPoolGenerator } from "@/server/shared/ids/pool";
import type { RegistryLoader } from "@/shared/registry";

export async function registerEventIdPool<
  C extends { idGenerator: IdGenerator }
>(loader: RegistryLoader<C>) {
  return new IdPoolGenerator(
    await loader.get("idGenerator"),
    () => CONFIG.logicIdPoolBatchSize
  );
}
