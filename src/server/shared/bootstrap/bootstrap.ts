import { SyncBootstrap } from "@/server/shared/bootstrap/sync";
import type { BDB } from "@/server/shared/storage";
import type { Delivery } from "@/shared/chat/types";
import type { Change } from "@/shared/ecs/change";
import type { RegistryLoader } from "@/shared/registry";

export interface Bootstrap {
  load(): Promise<[changes: Change[], deliveries: Delivery[]]>;
}

class EmptyBootstrap implements Bootstrap {
  async load(): Promise<[changes: Change[], deliveries: Delivery[]]> {
    return [[], []];
  }
}

export type BootstrapMode = "sync" | "empty";

export async function registerBootstrap<
  C extends { config: { bootstrapMode: BootstrapMode }; db: BDB }
>(loader: RegistryLoader<C>): Promise<Bootstrap> {
  const config = await loader.get("config");
  switch (config.bootstrapMode) {
    case "sync":
      return new SyncBootstrap();
    case "empty":
      return new EmptyBootstrap();
  }
}
