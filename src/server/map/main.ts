import type { MapContext } from "@/server/map/context";
import { registerPipeline } from "@/server/map/pipeline";
import { registerPreload } from "@/server/map/preload";
import { registerResources } from "@/server/map/resources";
import { registerMapServer } from "@/server/map/server";
import { registerStore } from "@/server/map/storage";
import { registerReplica } from "@/server/map/table";
import { registerWorldHelper } from "@/server/map/world";
import { Cleanup } from "@/server/shared/cleanup";
import { sharedServerContext } from "@/server/shared/context";
import { runServer } from "@/server/shared/main";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { registerWorldApi } from "@/server/shared/world/register";
import { RegistryBuilder } from "@/shared/registry";

void runServer(
  "map",
  (signal) =>
    new RegistryBuilder<MapContext>()
      .install(sharedServerContext)
      .bind("cleanup", async () => new Cleanup())
      .bind("pipeline", registerPipeline)
      .bind("preload", registerPreload)
      .bind("replica", registerReplica)
      .bind("resources", registerResources)
      .bind("server", registerMapServer)
      .bind("store", registerStore)
      .bind("worldApi", registerWorldApi({ signal }))
      .bind("worldHelper", registerWorldHelper)
      .bind("voxeloo", loadVoxeloo)
      .build(),
  async (context) => {
    await context.server.start();
  }
);
