import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScenes } from "@/client/game/renderers/scenes";
import type {
  ClientResourcePaths,
  ClientResources,
} from "@/client/game/resources/types";

import { ParticleSystem } from "@/client/game/resources/particles";
import { blockPlaceParticleMaterials } from "@/client/game/util/particles_systems";

import { voxelShard } from "@/shared/game/shard";
import { add } from "@/shared/math/linear";
import type { ReadonlyVec3 } from "@/shared/math/types";
import type { Key } from "@/shared/resources/types";
import type { Texture } from "three";

const PLACE_EFFECT_TRIGGER_RESOURCE: Key<ClientResourcePaths> =
  "/terrain/combined_mesh";

export class PlaceEffect {
  // The terrain mesh version which should trigger this effect, in order
  // to sync the effect on when the terrain mesh is actually modified.
  private playOnTerrainMeshVersion: number;
  done = false;
  private particleSystem: ParticleSystem | undefined;

  constructor(
    resources: ClientResources,
    // The voxel position in the world that was placed.
    public readonly placePos: ReadonlyVec3,
    public readonly placeWorldTime: number,
    private readonly face: number
  ) {
    // Relying on the assumption that the current cached terrain
    // mesh cannot yet be up-to-date and reflect changes associated
    // don't trigger the effect until the terrain is updated.
    this.playOnTerrainMeshVersion =
      resources.cachedVersion(
        PLACE_EFFECT_TRIGGER_RESOURCE,
        voxelShard(...placePos)
      ) + 1;
  }

  dispose() {
    if (this.particleSystem) {
      this.particleSystem.materials.dispose();
    }
    this.done = true;
  }

  tick(resources: ClientResources, time: number, texture: Texture) {
    if (this.done) {
      return;
    }

    if (this.particleSystem) {
      const skyParams = resources.get("/scene/sky_params");
      this.particleSystem.tickToTime(time, skyParams.sunDirection.toArray());
      if (this.particleSystem.allAnimationsComplete()) {
        this.dispose();
      }
    } else if (this.shouldTriggerPlaceEffect(resources)) {
      this.particleSystem = new ParticleSystem(
        blockPlaceParticleMaterials(texture, this.face).withClonedMaterial(),
        time
      );
      this.particleSystem.three.position.fromArray(
        add(this.placePos, [0.5, 0.5, 0.5])
      );
    }
  }

  private shouldTriggerPlaceEffect(resources: ClientResources) {
    if (this.particleSystem || this.done) {
      return false;
    }

    const cachedTerrainVersion = resources.cachedVersion(
      PLACE_EFFECT_TRIGGER_RESOURCE,
      voxelShard(...this.placePos)
    );
    return cachedTerrainVersion >= this.playOnTerrainMeshVersion;
  }

  addToScenes(scenes: Scenes) {
    if (this.done || !this.particleSystem) {
      return;
    }
    addToScenes(scenes, this.particleSystem.three);
  }
}
