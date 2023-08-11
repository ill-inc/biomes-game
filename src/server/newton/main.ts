import type { ServerCollisionSpace } from "@/server/newton/collision";
import { registerCollisionSpace } from "@/server/newton/collision";
import type { NewtonServer } from "@/server/newton/server";
import { registerNewtonServer } from "@/server/newton/server";
import type { NewtonReplica } from "@/server/newton/table";
import { registerNewtonReplica } from "@/server/newton/table";
import type { SharedServerContext } from "@/server/shared/context";
import { sharedServerContext } from "@/server/shared/context";
import { runServer } from "@/server/shared/main";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import type { WorldApi } from "@/server/shared/world/api";
import { registerWorldApi } from "@/server/shared/world/register";
import { RegistryBuilder } from "@/shared/registry";
import type { VoxelooModule } from "@/shared/wasm/types";

export interface NewtonServerContext extends SharedServerContext {
  collisionSpace: ServerCollisionSpace;
  newtonReplica: NewtonReplica;
  newtonServer: NewtonServer;
  worldApi: WorldApi;
  voxeloo: VoxelooModule;
}

void runServer(
  "newton",
  (signal) =>
    new RegistryBuilder<NewtonServerContext>()
      .install(sharedServerContext)
      .bind("collisionSpace", registerCollisionSpace)
      .bind("newtonReplica", registerNewtonReplica)
      .bind("newtonServer", registerNewtonServer)
      .bind("worldApi", registerWorldApi({ signal }))
      .bind("voxeloo", loadVoxeloo)
      .build(),
  async (context) => {
    await context.newtonServer.start();
  }
);
