import type { ClientContext, ClientContextSubset } from "@/client/game/context";
import { AudioScript } from "@/client/game/scripts/audio";
import { CameraScript } from "@/client/game/scripts/camera";
import { CursorScript } from "@/client/game/scripts/cursor";
import { ForbiddenEditsScript } from "@/client/game/scripts/forbidden_edits";
import { InteractScript } from "@/client/game/scripts/interact";
import { OverlayScript } from "@/client/game/scripts/overlays";
import { ParticlesScript } from "@/client/game/scripts/particles";
import type { Script } from "@/client/game/scripts/script_controller";
import { ScriptController } from "@/client/game/scripts/script_controller";
import { TransientBeamsScript } from "@/client/game/scripts/transient_beams";
import type { RegistryLoader } from "@/shared/registry";
import { compact } from "lodash";

function getScripts(
  deps: ClientContextSubset<
    | "audioManager"
    | "authManager"
    | "clientConfig"
    | "events"
    | "gardenHose"
    | "input"
    | "mailman"
    | "mapManager"
    | "marchHelper"
    | "permissionsManager"
    | "resources"
    | "socialManager"
    | "table"
    | "userId"
    | "voxeloo"
  >
): Script[] {
  const {
    userId,
    input,
    resources,
    table,
    mailman,
    clientConfig,
    authManager,
    audioManager,
    mapManager,
    events,
    permissionsManager,
    gardenHose,
  } = deps;

  return compact([
    new CameraScript(userId, input, resources, table, clientConfig, events),
    new TransientBeamsScript(resources),
    new ForbiddenEditsScript(resources),
    new ParticlesScript(deps, resources, gardenHose),
    new OverlayScript(
      userId,
      resources,
      table,
      mailman,
      clientConfig,
      authManager,
      mapManager,
      deps.voxeloo
    ),
    new CursorScript(
      userId,
      resources,
      permissionsManager,
      table,
      deps.voxeloo
    ),
    new AudioScript(resources, table, audioManager),
    resources.get("/server/sync_target").kind === "localUser"
      ? new InteractScript(deps)
      : undefined,
    // Tick the input for render-related phases -- THIS SHOULD BE LAST
    {
      name: "render",
      tick() {
        input.tick("render");
      },
    },
  ]);
}

export async function buildRenderScriptController(
  loader: RegistryLoader<ClientContext>
) {
  const deps = await loader.getAll(
    "userId",
    "input",
    "resources",
    "table",
    "mailman",
    "clientConfig",
    "authManager",
    "audioManager",
    "mapManager",
    "marchHelper",
    "io",
    "events",
    "permissionsManager",
    "gardenHose",
    "socialManager",
    "voxeloo"
  );

  const scriptController = new ScriptController(getScripts(deps));
  deps.io.addListener("changedSyncTarget", () => {
    scriptController.reassign(getScripts(deps));
  });
  return scriptController;
}
