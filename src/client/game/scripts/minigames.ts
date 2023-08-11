import type {
  ClientContextKeysFor,
  ClientContextSubset,
} from "@/client/game/context";
import type { Script } from "@/client/game/scripts/script_controller";
import { clientModFor } from "@/server/shared/minigames/client_mods";
import type { ClientMod } from "@/server/shared/minigames/types";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";

export class MinigamesScript implements Script {
  readonly name = "minigames";

  currentMinigameScript?: Script;
  currentMinigameScriptInstanceId?: BiomesId;
  currentMakeScriptObject?: (...arg: any[]) => Script; // For hot reload

  constructor(
    private readonly deps: ClientContextSubset<
      | "resources"
      | "userId"
      | "clientMods"
      | ClientContextKeysFor<ClientMod["makeClientScript"]>
    >
  ) {}

  clear() {
    this.currentMinigameScript?.clear?.();
    this.currentMinigameScript = undefined;
    this.currentMinigameScriptInstanceId = undefined;
  }

  tick(dt: number) {
    this.delegationTick(dt);
  }

  private delegationTick(dt: number) {
    const activePlay = this.deps.resources.get(
      "/ecs/c/playing_minigame",
      this.deps.userId
    );

    if (!activePlay) {
      if (this.currentMinigameScript) {
        this.currentMinigameScript.clear?.();
        this.currentMinigameScriptInstanceId = undefined;
      }
      return;
    }

    const clientMod = clientModFor(
      this.deps.clientMods,
      activePlay.minigame_type
    );

    if (
      this.currentMinigameScriptInstanceId &&
      activePlay.minigame_instance_id ===
        this.currentMinigameScriptInstanceId &&
      clientMod.makeClientScript === this.currentMakeScriptObject
    ) {
      this.currentMinigameScript?.tick(dt);
      return;
    }

    if (!clientMod.makeClientScript) {
      return;
    }

    const minigameInstance = this.deps.resources.get(
      "/ecs/c/minigame_instance",
      activePlay.minigame_instance_id
    );
    const minigame = this.deps.resources.get(
      "/ecs/c/minigame_component",
      activePlay.minigame_id
    );

    if (!minigameInstance || !minigame) {
      log.warn(
        "Have an active minigame but missing instance or metadata in ECS, skipping script tick"
      );
      return;
    }

    this.currentMinigameScript = clientMod.makeClientScript(
      this.deps,
      activePlay.minigame_id,
      activePlay.minigame_instance_id
    );
    this.currentMinigameScriptInstanceId = activePlay.minigame_instance_id;
    this.currentMinigameScript.tick(dt);
    this.currentMakeScriptObject = clientMod.makeClientScript;
  }
}
