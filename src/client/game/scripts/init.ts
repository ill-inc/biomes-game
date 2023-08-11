import type { ClientContext, ClientContextSubset } from "@/client/game/context";
import { BecomeNPCScript } from "@/client/game/scripts/become_npc";
import { GroupPlacementScript } from "@/client/game/scripts/group_placement";
import { MinigamesScript } from "@/client/game/scripts/minigames";
import { PlayerScript } from "@/client/game/scripts/player";
import type { Script } from "@/client/game/scripts/script_controller";
import { ScriptController } from "@/client/game/scripts/script_controller";
import type { RegistryLoader } from "@/shared/registry";

function scriptsForObserver(_deps: ClientContextSubset<"userId">): Script[] {
  return [];
}
function scriptsForNonObserver(
  deps: ClientContextSubset<
    | "userId"
    | "input"
    | "events"
    | "chatIo"
    | "io"
    | "resources"
    | "table"
    | "mailman"
    | "audioManager"
    | "clientConfig"
    | "socialManager"
    | "authManager"
    | "gardenHose"
    | "permissionsManager"
    | "clientMods"
    | "authManager"
    | "voxeloo"
  >
): Script[] {
  const {
    userId,
    input,
    events,
    chatIo,
    io: clientIo,
    resources,
    table,
    mailman,
    audioManager,
    clientConfig,
    gardenHose,
    permissionsManager,
    authManager,
    voxeloo,
  } = deps;

  return [
    new PlayerScript(
      userId,
      input,
      events,
      chatIo,
      clientIo,
      resources,
      audioManager,
      table,
      mailman,
      clientConfig,
      gardenHose,
      permissionsManager,
      authManager,
      voxeloo
    ),
    new GroupPlacementScript(
      input,
      resources,
      table,
      events,
      permissionsManager
    ),
    new BecomeNPCScript(
      input,
      resources,
      table,
      events,
      permissionsManager,
      userId
    ),
    new MinigamesScript(deps),
  ];
}

export async function buildScriptController(
  loader: RegistryLoader<ClientContext>
) {
  const io = await loader.get("io");

  const scripts = async () => {
    if (io.syncTarget.kind !== "localUser") {
      return scriptsForObserver(await loader.getAll("userId"));
    } else {
      return scriptsForNonObserver(
        await loader.getAll(
          "userId",
          "input",
          "events",
          "chatIo",
          "io",
          "resources",
          "table",
          "mailman",
          "audioManager",
          "clientConfig",
          "socialManager",
          "authManager",
          "gardenHose",
          "permissionsManager",
          "clientMods",
          "authManager",
          "voxeloo"
        )
      );
    }
  };

  const controller = new ScriptController(await scripts());
  io.addListener("changedSyncTarget", () => {
    void scripts().then((s) => {
      controller.reassign(s);
    });
  });

  return controller;
}
