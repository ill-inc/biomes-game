import type { ClientTable } from "@/client/game/game";
import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import type { ClientResources } from "@/client/game/resources/types";
import { secondsSinceEpoch } from "@/shared/ecs/config";
import { RobotsThatClearSelector } from "@/shared/ecs/gen/selectors";
import { add, distSq, distSqToAABB } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import { getNowMs } from "@/shared/util/helpers";
import { clamp } from "lodash";

const CULL_DISTANCE_SQ = 20 * 20;

export class ProtectionRenderer implements Renderer {
  name = "protection";

  lastPlayerPos: Vec3 | undefined;
  lastPlayerPosTime: number | undefined;

  constructor(
    private readonly table: ClientTable,
    private readonly resources: ClientResources
  ) {}

  draw(scenes: Scenes, _dt: number) {
    const localPlayerPos = this.resources.get("/scene/local_player").player
      .position;
    const adjustedPlayerPos = add(localPlayerPos, [0, 1.0, 0]);

    // Check how long the player has been at this position
    if (
      !this.lastPlayerPos ||
      distSq(localPlayerPos, this.lastPlayerPos) > 1.0
    ) {
      this.lastPlayerPos = localPlayerPos;
      this.lastPlayerPosTime = secondsSinceEpoch();
    }
    const secondsAtPos = this.lastPlayerPosTime
      ? secondsSinceEpoch() - this.lastPlayerPosTime
      : 0;

    for (const id of this.table.scanIds(RobotsThatClearSelector.query.all())) {
      // Check if we're within cull distance
      const { aabb } = this.resources.get("/protection/boundary", id);
      if (!aabb || distSqToAABB(localPlayerPos, aabb) > CULL_DISTANCE_SQ) {
        continue;
      }

      const mesh = this.resources.get("/protection/mesh", id);
      if (mesh) {
        const tweaks = this.resources.get("/tweaks");
        // fade out over 1 seconds, starting at 3 seconds
        const fadeOut = tweaks.protectionField.fadeOut
          ? clamp(1.0 - (secondsAtPos - 3.0) / 1.0, 0, 1)
          : 1.0;
        mesh.update(adjustedPlayerPos, fadeOut, getNowMs());
        mesh.draw(scenes);
      }
    }
  }
}
