import type { GizmoServer } from "@/server/gizmo/server";
import { registerGizmoServer } from "@/server/gizmo/server";
import type { SharedServerContext } from "@/server/shared/context";
import { sharedServerContext } from "@/server/shared/context";
import { runServer } from "@/server/shared/main";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import type { WorldApi } from "@/server/shared/world/api";
import { registerWorldApi } from "@/server/shared/world/register";
import { RegistryBuilder } from "@/shared/registry";
import type { VoxelooModule } from "@/shared/wasm/types";

export interface GizmoServerContext extends SharedServerContext {
  server: GizmoServer;
  worldApi: WorldApi;
  voxeloo: VoxelooModule;
}

void runServer(
  "gizmo",
  (signal) =>
    new RegistryBuilder<GizmoServerContext>()
      .install(sharedServerContext)
      .bind("worldApi", registerWorldApi({ signal }))
      .bind("server", registerGizmoServer)
      .bind("voxeloo", loadVoxeloo)
      .build(),
  async (context) => {
    await context.server.start();
  }
);
