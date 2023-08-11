import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScenes } from "@/client/game/renderers/scenes";
import { MAX_MUCK, MAX_MUCK_PARTICLES } from "@/client/game/resources/muck";
import type { ClientResources } from "@/client/game/resources/types";
import { updateMuckSporesMaterial } from "@/gen/client/game/shaders/muck_spores";
import { lerp } from "@/shared/math/math";

export const makeMuckRenderer = (resources: ClientResources): Renderer => ({
  name: "muck",
  draw: (scenes: Scenes, dt: number) => {
    const sporeParticles = resources.cached("/muck/spore_particles");
    if (!sporeParticles) {
      return;
    }

    const sky = resources.get("/scene/sky_params");
    const player = resources.get("/scene/local_player");
    const time = resources.get("/clock").time;
    const { muckyness } = resources.get(
      "/players/environment/muckyness",
      player.id
    );
    const cameraEnv = resources.get("/camera/environment");
    cameraEnv.muckyness.tick(dt);

    updateMuckSporesMaterial(sporeParticles.material, {
      sunDirection: sky.sunDirection.toArray(),
      playerPosition: player.player.centerPos(),
      radius: 20,
      sporeSizeMin: 0.01,
      sporeSizeMax: 0.03,
      angularSpeedMin: 0.1,
      angularSpeedMax: 1.0,
      velocityMin: [-0.25, 0.2, -0.25],
      velocityMax: [0.25, 0.25, 0.25],
      alphaMin: 0.5,
      alphaMax: 1.0,
      sporeCount: lerp(0, MAX_MUCK_PARTICLES, muckyness / MAX_MUCK),
      time,
    });

    sporeParticles.position.set(0, 0, 0);
    addToScenes(scenes, sporeParticles);
  },
});
