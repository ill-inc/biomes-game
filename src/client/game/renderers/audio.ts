import type { AudioManager } from "@/client/game/context_managers/audio_manager";
import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import type { ClientResources } from "@/client/game/resources/types";

export class AudioRenderer implements Renderer {
  name = "audio";

  constructor(
    readonly resources: ClientResources,
    readonly audioManager: AudioManager
  ) {}

  draw(_scenes: Scenes, _dt: number) {
    this.audioManager.purgeInactive(this.resources.get("/clock").time);
  }
}
