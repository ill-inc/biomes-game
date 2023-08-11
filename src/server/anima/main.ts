import type { AnimaServerContext } from "@/server/anima/context";
import { registerAnimaServer } from "@/server/anima/server";
import { registerLogicApi } from "@/server/shared/api/logic";
import { sharedServerContext } from "@/server/shared/context";
import { registerIdGenerator } from "@/server/shared/ids/generator";
import { runServer } from "@/server/shared/main";
import { registerAnimaReplica } from "@/server/shared/npc/table";
import { loadVoxeloo } from "@/server/shared/voxeloo";
import { registerWorldApi } from "@/server/shared/world/register";
import { RegistryBuilder } from "@/shared/registry";

void runServer(
  "anima",
  (signal) =>
    new RegistryBuilder<AnimaServerContext>()
      .install(sharedServerContext)
      .bind("logicApi", registerLogicApi)
      .bind("worldApi", registerWorldApi({ signal }))
      .bind("idGenerator", registerIdGenerator)
      .bind("server", registerAnimaServer)
      .bind("replica", registerAnimaReplica)
      .bind("voxeloo", loadVoxeloo)
      .build(),
  async (context) => {
    await context.server.start();
  }
);
