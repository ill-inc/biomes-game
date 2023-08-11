import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import type { ClientResources } from "@/client/game/resources/types";
import {
  SECONDS_PER_DAY,
  moonDirection,
  moonDirectionOffset,
  moonInclination,
  sunDirection,
  sunInclination,
} from "@/shared/game/sun_moon_position";
import * as THREE from "three";

export class SkyRenderer implements Renderer {
  name = "sky";
  ambient_light: THREE.Light;
  directional_light: THREE.Light;
  resources: ClientResources;

  constructor(resources: ClientResources) {
    this.ambient_light = new THREE.AmbientLight(0xffffff, 0.5);
    this.directional_light = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directional_light.position.set(1, 1, 1);
    this.resources = resources;
  }

  animateSky() {
    const clock = this.resources.get("/clock");
    const tweaks = this.resources.get("/tweaks");
    const playerModifiers = this.resources.get("/player/modifiers");

    const time = (() => {
      if (tweaks.overrideTimeOfDay) {
        return (tweaks.timeOfDay / 100) * SECONDS_PER_DAY;
      } else {
        return playerModifiers.nightVision.enabled
          ? 0.5 * SECONDS_PER_DAY
          : clock.time;
      }
    })();

    this.directional_light.position.set(
      ...sunDirection(sunInclination(time, tweaks.sunDilation))
    );

    this.resources.update("/scene/sky_params", (params) => {
      const moonDir = moonDirection(moonInclination(time));
      params.sunDirection = this.directional_light.position;
      params.moonDirection = new THREE.Vector3(...moonDir);
      params.moonDirectionOffset = new THREE.Vector3(
        ...moonDirectionOffset(moonDir)
      );
      params.sunColor = this.directional_light.color;
    });
  }

  draw(scenes: Scenes) {
    this.animateSky();

    // Add the sky lights to the scene.
    // TODO(taylor): Remove these ones everything uses a common framework
    // for accessing lighting uniforms.
    scenes.three.add(this.ambient_light);
    scenes.three.add(this.directional_light);
  }
}
