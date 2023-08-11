import type { ClientTable } from "@/client/game/game";
import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScenes } from "@/client/game/renderers/scenes";
import * as THREE from "three";

import type { ClientConfig } from "@/client/game/client_config";
import type { AudioManager } from "@/client/game/context_managers/audio_manager";
import { BasePassMaterial } from "@/client/game/renderers/base_pass_material";
import { nearestKEntitiesInFrustum } from "@/client/game/renderers/cull_entities";
import { drawLimitValueWithTweak } from "@/client/game/resources/graphics_settings";
import { placeableSystem } from "@/client/game/resources/placeables/types";
import type { ClientResources } from "@/client/game/resources/types";
import type { AnimationAction } from "@/client/game/util/animation_system";
import type { TimelineMatcher } from "@/client/game/util/timeline_matcher";
import { updateBreakableMaterial } from "@/gen/client/game/shaders/breakable";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { PlaceableComponent } from "@/shared/ecs/gen/components";
import { PlaceableSelector } from "@/shared/ecs/gen/selectors";
import { anItem } from "@/shared/game/item";
import { Cval } from "@/shared/util/cvals";
import { clamp } from "lodash";

const numPlaceablesCval = new Cval({
  path: ["renderer", "placeables", "numPlaceables"],
  help: "The total number of placeables this client renderer is aware of last frame.",
  initialValue: 0,
});

const numPlaceablesRenderedCval = new Cval({
  path: ["renderer", "placeables", "numRenderedPlaceables"],
  help: "The total number of placeables rendered in the last frame.",
  initialValue: 0,
});

export type PlaceableAnimationAction = AnimationAction<typeof placeableSystem>;

function getAnimationAction(
  placeableComponent: PlaceableComponent,
  timelineMatcher: TimelineMatcher,
  secondsSinceEpoch: number
): PlaceableAnimationAction | undefined {
  const item = anItem(placeableComponent.item_id);
  if (
    item.defaultAnimationLoop &&
    placeableSystem.hasAnimation(item.defaultAnimationLoop)
  ) {
    return {
      layers: { all: "apply" },
      state: { repeat: { kind: "repeat" }, startTime: 0 },
      weights: placeableSystem.singleAnimationWeight(
        item.defaultAnimationLoop,
        1
      ),
    };
  }

  if (placeableComponent.animation?.start_time) {
    return {
      weights: placeableSystem.singleAnimationWeight(
        placeableComponent.animation.type,
        1
      ),
      state: {
        repeat: {
          kind: placeableComponent.animation?.repeat ?? "once",
          clampWhenFinished: true,
        },
        startTime: timelineMatcher.match(
          placeableComponent.animation.type,
          placeableComponent.animation.start_time,
          secondsSinceEpoch
        ),
      },
      layers: {
        all: "apply",
      },
    };
  }
}

export const makePlaceablesRenderer = (
  clientConfig: ClientConfig,
  audioManager: AudioManager,
  table: ClientTable,
  resources: ClientResources
): Renderer => {
  return {
    name: "placeables",
    draw: (scenes: Scenes, dt: number) => {
      numPlaceablesCval.value = 0;
      numPlaceablesRenderedCval.value = 0;

      const camera = resources.get("/scene/camera");
      const tweaks = resources.get("/tweaks");
      if (!tweaks.showPlaceables) {
        return;
      }

      const clock = resources.get("/clock");

      const entities = nearestKEntitiesInFrustum(
        camera,
        (q) => table.scan(q),
        PlaceableSelector,
        drawLimitValueWithTweak(
          resources,
          tweaks.clientRendering.placeableRenderLimit
        )
      );

      const sky = resources.get("/scene/sky_params");
      const player = resources.get("/scene/local_player");
      const destroyingMaterial = resources.cached(
        "/materials/destroying_material"
      );

      for (const entity of entities) {
        ++numPlaceablesCval.value;

        const audio = resources.cached("/scene/placeable/audio", entity.id);
        if (audio) {
          if (!resources.get("/ecs/c/video_component", entity.id)?.video_url) {
            audio.position.fromArray(entity.position.v);
            if (entity.placeable_component.item_id === BikkieIds.boombox) {
              const volume = entity.video_component?.muted
                ? 0
                : audioManager.getVolume("settings.volume.media", "disco");
              audio.setVolume(volume);
            } else if (
              entity.placeable_component.item_id === BikkieIds.arcadeMachine
            ) {
              audio.setVolume(
                audioManager.getVolume("settings.volume.media", "arcade")
              );
            }
            addToScenes(scenes, audio);
            audioManager.setActive(audio, clock.time);
          }
        }

        const mesh = resources.cached("/scene/placeable/mesh", entity.id);
        if (!mesh) {
          continue;
        }

        const { meshAnimationInfo, manualAnimationUpdate } = mesh;
        if (meshAnimationInfo) {
          const animAccum = placeableSystem.newAccumulatedActions(
            meshAnimationInfo.animationMixer.time,
            placeableSystem.durationFromState(
              meshAnimationInfo.animationSystemState
            )
          );
          placeableSystem.accumulateAction(
            getAnimationAction(
              entity.placeable_component,
              meshAnimationInfo.timelineMatcher,
              clock.time
            ),
            animAccum
          );
          placeableSystem.applyAccumulatedActionsToState(
            animAccum,
            meshAnimationInfo.animationSystemState,
            // These animations are usually discrete (e.g. open/close) and quick,
            // so make animation transition blends happen faster to ensure they
            // complete before the actual animation completes, otherwise it gets
            // paused in a not quite completed (e.g. closed/opened) state.
            dt * 2
          );
          meshAnimationInfo.animationMixer.update(dt);
        }

        if (manualAnimationUpdate) {
          manualAnimationUpdate(mesh, dt, clock.time);
        }

        if (mesh.particleSystems?.length) {
          mesh.particleSystems.forEach((particles) => {
            particles.tickToTime(clock.time, sky.sunDirection.toArray());
            particles.three.position.fromArray(entity.position.v);
            addToScenes(scenes, particles.three);
          });
        }

        // Destruction
        // we don't actually use this material other than for its numFrames
        let destroyTextureFrame = -1;
        if (
          player.destroyInfo?.placeableId === entity.id &&
          destroyingMaterial
        ) {
          let completion = player.destroyInfo.percentage ?? 0;
          if (player.destroyInfo.finished) {
            if (player.destroyInfo.activeAction.action === "destroy") {
              completion = 1.0;
            } else {
              completion = 0.0;
            }
          }
          const frames = destroyingMaterial.numFrames;
          destroyTextureFrame =
            completion > 0
              ? clamp(Math.floor((1 + frames) * completion) - 1, 0, frames)
              : -1;
        } else if (
          entity.restores_to?.restore_to_state === "deleted" &&
          destroyingMaterial
        ) {
          // Show destruction for entities that are being restored.
          const restoreTime = entity.restores_to.trigger_at;
          const placeTime = entity.placed_by?.placed_at;
          if (restoreTime && placeTime) {
            destroyTextureFrame = clamp(
              Math.ceil(
                ((clock.time - placeTime) / (restoreTime - placeTime)) *
                  destroyingMaterial.numFrames
              ),
              0,
              destroyingMaterial.numFrames - 1
            );
          }
        }

        mesh.three.traverse((child) => {
          if (
            child instanceof THREE.SkinnedMesh ||
            child instanceof THREE.Mesh
          ) {
            child.matrixWorldNeedsUpdate = true;
            if (child.material instanceof BasePassMaterial) {
              updateBreakableMaterial(child.material, {
                spatialLighting: mesh.spatialLighting,
                light: sky.sunDirection.toArray(),
                destroyTextureFrame,
              });
            }
          }
        });

        ++numPlaceablesRenderedCval.value;
        addToScenes(scenes, mesh.three);

        if (mesh.punchthrough) {
          addToScenes(scenes, mesh.punchthrough);
        }
        if (mesh.css3d) {
          addToScenes(scenes, mesh.css3d);
        }
      }
    },
  };
};
