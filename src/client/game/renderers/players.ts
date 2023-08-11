import type { ClientConfig } from "@/client/game/client_config";
import type { AudioManager } from "@/client/game/context_managers/audio_manager";
import type { AuthManager } from "@/client/game/context_managers/auth_manager";
import type { PermissionsManager } from "@/client/game/context_managers/permissions_manager";
import type { ClientTable } from "@/client/game/game";
import { BasePassMaterial } from "@/client/game/renderers/base_pass_material";
import type { Renderable } from "@/client/game/renderers/cull_entities";
import { cullEntities } from "@/client/game/renderers/cull_entities";
import type { Renderer } from "@/client/game/renderers/renderer_controller";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScenes } from "@/client/game/renderers/scenes";
import type { Camera } from "@/client/game/resources/camera";
import { drawLimitValueWithTweak } from "@/client/game/resources/graphics_settings";
import { ItemMeshKey } from "@/client/game/resources/item_mesh";
import type { LocalPlayer } from "@/client/game/resources/local_player";
import type { ParticleSystemMaterials } from "@/client/game/resources/particles";
import { ParticleSystem } from "@/client/game/resources/particles";
import type { LoadedPlayerMesh } from "@/client/game/resources/player_mesh";
import type { Player, ScenePlayer } from "@/client/game/resources/players";
import type { ClientResources } from "@/client/game/resources/types";
import {
  camOffsetVector,
  clippedThirdPersonCamPositionWithCollision,
  getCamOrientation,
  playerFirstPersonCamPosition,
  thirdPersonCamPosition,
} from "@/client/game/util/camera";
import { physicsHookPosition } from "@/client/game/util/fishing/helpers";
import { syncAnimationsToPlayerState } from "@/client/game/util/player_animations";
import { updateBasicMaterial } from "@/gen/client/game/shaders/basic";
import { updatePlayerSkinnedMaterial } from "@/gen/client/game/shaders/player_skinned";
import type { TweakableConfig } from "@/server/shared/minigames/ruleset/tweaks";
import { getBiscuits } from "@/shared/bikkie/active";
import { BikkieIds } from "@/shared/bikkie/ids";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import type { ReadonlyEntity } from "@/shared/ecs/gen/entities";
import { PlayerSelector } from "@/shared/ecs/gen/selectors";
import type {
  ReadonlyEmoteFishingInfo,
  ReadonlyEmoteThrowInfo,
  ReadonlyItem,
} from "@/shared/ecs/gen/types";
import { isFloraId } from "@/shared/game/ids";
import { anItem } from "@/shared/game/item";
import { getPlayerBuffs, playerAABB } from "@/shared/game/players";
import type { BiomesId } from "@/shared/ids";
import { growAABB, interp, lengthSq, sub } from "@/shared/math/linear";
import type { Vec3 } from "@/shared/math/types";
import { timeCode } from "@/shared/metrics/performance_timing";
import { Cval } from "@/shared/util/cvals";
import type { VoxelooModule } from "@/shared/wasm/types";
import * as THREE from "three";
import { Vector3 } from "three";

interface RenderablePlayer {
  ecsPlayer: ReadonlyEntity;
  player: Player;
  scenePlayer: ScenePlayer;
  playerMesh: LoadedPlayerMesh;
  localPlayer?: LocalPlayer;
}

const numPlayersCval = new Cval({
  path: ["renderer", "players", "numPlayers"],
  help: "The total number of players this client renderer is aware of last frame.",
  initialValue: 0,
});
const numRenderedPlayersCval = new Cval({
  path: ["renderer", "players", "numRenderedPlayers"],
  help: "The total number of players this client rendered last frame.",
  initialValue: 0,
});

export class PlayersRenderer implements Renderer {
  name = "player";

  constructor(
    private readonly clientConfig: ClientConfig,
    private readonly authManager: AuthManager,
    private readonly table: ClientTable,
    private readonly resources: ClientResources,
    private readonly audioManager: AudioManager,
    private readonly permissionsManager: PermissionsManager,
    private readonly voxeloo: VoxelooModule
  ) {}

  // localPlayer is only defined if this player is the local player.
  updatePlayerThree(
    player: Player,
    mesh: LoadedPlayerMesh,
    dt: number,
    camera: Camera,
    localPlayer?: LocalPlayer
  ) {
    // Animations
    const { three, animationSystemState } = mesh;
    const clock = this.resources.get("/clock");
    three.scale.setScalar(player.scale);
    const scenePlayer = this.resources.get("/scene/player", player.id);
    three.position.fromArray(scenePlayer.position);

    player.smoothedSpatialLighting.tick(dt);
    player.smoothedEyeAdaptationSpatialLighting.tick(dt);
    const sky = this.resources.get("/scene/sky_params");
    three.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof BasePassMaterial
      ) {
        updatePlayerSkinnedMaterial(child.material, {
          spatialLighting: player.getSpatialLighting(),
          light: sky.sunDirection.toArray(),
        });
      }
    });

    three.rotation.y = scenePlayer.orientation[1];

    const isGremlin = this.resources.get("/ecs/c/gremlin", player.id);
    const playerHealth = this.resources.get("/ecs/c/health", player.id);

    // TODO (tdimson): Make a proper death animation
    // Lie on your back if you are dead
    if (
      !isGremlin &&
      playerHealth &&
      (playerHealth.hp <= 0 ||
        (player.id === localPlayer?.id &&
          (localPlayer?.playerStatus === "dead" ||
            (localPlayer?.playerStatus === "respawning" &&
              playerHealth.hp <= 0))))
    ) {
      three.rotation.x = Math.PI / 2;
    } else {
      three.rotation.x = 0;
    }

    // Audio
    // TODO (akarpenko): clean this up
    if (this.audioManager.isRunning()) {
      if (
        localPlayer?.destroyInfo &&
        animationSystemState.actions.arms.destroy
      ) {
        const attackAction = animationSystemState.actions.arms.destroy;
        const triggerAt = 0.95;
        const currentProgress =
          attackAction.time / attackAction.getClip().duration;
        if (Math.abs(currentProgress - triggerAt) < 0.1) {
          if (
            localPlayer?.destroyInfo &&
            !isFloraId(localPlayer.destroyInfo.terrainId ?? 0)
          ) {
            player.setSound(
              this.resources,
              this.audioManager,
              "hit",
              "block_hit_stone"
            );
          }
        }
      }

      if (player.isEmoting(clock.time, "warp")) {
        player.setSound(
          this.resources,
          this.audioManager,
          "warp",
          "player_warp"
        );
      } else if (player.isEmoting(clock.time, "splash")) {
        player.setSound(this.resources, this.audioManager, "splash", "splash");
      } else if (player.isEmoting(clock.time, "applause")) {
        player.setSound(
          this.resources,
          this.audioManager,
          "applause",
          "applause"
        );
      }

      const audioThree = localPlayer ? camera.three : three;
      const audio = player.getFootstepsSound(this.resources, this.audioManager);
      if (
        audio &&
        audio.getVolume() > 0 &&
        lengthSq(player.velocity) >= 0.001 &&
        Math.abs(player.velocity[1]) <= 0.001 // don't play footsteps in the air when jumping
      ) {
        audioThree.add(audio);
        if (!audio.isPlaying) {
          audio.play();
        }
      } else if (audio && audio.isPlaying) {
        audio.stop();
      }

      player.getSounds().forEach((sound, soundType) => {
        if (soundType === "footsteps") {
          return;
        }
        audioThree.add(sound);
      });
    }
  }

  updateAnimations(renderablePlayer: RenderablePlayer, dt: number) {
    const { player, playerMesh } = renderablePlayer;
    const clock = this.resources.get("/clock");
    const {
      animationSystemState: animationSystem,
      animationMixer,
      timelineMatcher,
    } = playerMesh;
    player.updateEmoteState(animationSystem, clock.time);
    syncAnimationsToPlayerState(
      animationSystem,
      player,
      dt,
      (label: string, worldTime: number) =>
        timelineMatcher.match(label, worldTime, clock.time),
      this.resources
    );

    animationMixer.update(dt);
  }

  private lastDamageAnimationTime(
    renderablePlayer: RenderablePlayer,
    secondsSinceEpoch: number
  ) {
    if (
      !renderablePlayer.ecsPlayer.health?.lastDamageTime ||
      (renderablePlayer.ecsPlayer.health.lastDamageAmount ?? 0) >= 0
    ) {
      return -Infinity;
    }

    return renderablePlayer.playerMesh.timelineMatcher.match(
      "onHit",
      renderablePlayer.ecsPlayer.health.lastDamageTime,
      secondsSinceEpoch
    );
  }

  updateSkinColorEffects(renderablePlayer: RenderablePlayer) {
    const { playerMesh } = renderablePlayer;
    const clock = this.resources.get("/clock");
    const secondsSinceEpoch = clock.time;
    const timeSinceLastHit =
      playerMesh.timelineMatcher.animationNow() -
      this.lastDamageAnimationTime(renderablePlayer, secondsSinceEpoch);

    const ruleset = this.resources.get("/ruleset/current");
    const RED_FLASH_SECONDS = 0.2;
    const redFlashProgress = Math.min(
      1,
      Math.max(0, timeSinceLastHit / RED_FLASH_SECONDS)
    );

    const showsAsObserver = ruleset.playerShowsAsObserver(
      renderablePlayer.ecsPlayer
    );

    // Shader material update.
    playerMesh.three.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof BasePassMaterial
      ) {
        updatePlayerSkinnedMaterial(child.material, {
          baseColor: showsAsObserver
            ? [0, 0, 0]
            : [1, redFlashProgress, redFlashProgress],
          emissiveAdd: 0.1 * Math.max(0, 1 - 2 * redFlashProgress),
        });
      }
    });
  }

  updateParticleEffects(renderablePlayer: RenderablePlayer) {
    const { player, playerMesh } = renderablePlayer;
    const commonEffects = this.resources.cached("/scene/player/common_effects");
    if (!commonEffects) {
      return;
    }

    // Healing particles.
    const health = this.resources.get("/ecs/c/health", player.id);
    if (!health) {
      return;
    }
    const clock = this.resources.get("/clock");

    const HEALING_TIME_DECAY_SECONDS = 2;
    const currentlyHealing =
      health.lastDamageSource?.kind === "fireHeal" &&
      clock.time < (health.lastDamageTime ?? 0) + HEALING_TIME_DECAY_SECONDS;
    const damagedAndHealing = health.hp < health.maxHp && currentlyHealing;
    const enteredHealingRange = !player.currentlyHealing && currentlyHealing;
    player.currentlyHealing = currentlyHealing;

    this.updateSingleParticleEffect({
      particleSystem: player.healingParticleEffect,
      setParticleSystem: (p) => (player.healingParticleEffect = p),
      particleSystemMaterials: commonEffects.healingParticleMaterials,
      shouldBeginParticles: enteredHealingRange || damagedAndHealing,
      shouldEndParticles: !damagedAndHealing,
      renderablePlayer,
      endParticlesDelaySeconds: HEALING_TIME_DECAY_SECONDS,
    });

    this.updateSingleParticleEffect({
      particleSystem: player.warpParticleEffect,
      setParticleSystem: (p) => (player.warpParticleEffect = p),
      particleSystemMaterials: commonEffects.warpParticleMaterials,
      shouldBeginParticles: player.isEmoting(clock.time, "warp"),
      shouldEndParticles: !player.isEmoting(clock.time, "warp"),
      renderablePlayer,
      endParticlesDelaySeconds: 0.5,
    });

    // The local player applicable buffs gives more information because the
    // client knows about its own effective acls that buffs may depend on.
    const playerBuffs = player.isLocal
      ? this.resources.get("/player/applicable_buffs").buffs
      : getPlayerBuffs(this.voxeloo, this.resources, player.id);

    for (const biscuit of getBiscuits(bikkie.schema.buffs)) {
      if (!biscuit.particleIcon) {
        continue;
      }
      const hasBuff = playerBuffs.some((buff) => buff.item_id === biscuit.id);
      const buffParticleMaterial = this.resources.cached(
        "/scene/player/buff_effects",
        biscuit.id
      );
      if (!buffParticleMaterial) {
        continue;
      }

      this.updateSingleParticleEffect({
        particleSystem: player.buffParticleEffects[biscuit.id],
        setParticleSystem: (p) => (player.buffParticleEffects[biscuit.id] = p),
        particleSystemMaterials: buffParticleMaterial,
        shouldBeginParticles: hasBuff,
        shouldEndParticles: !hasBuff,
        renderablePlayer,
      });
    }

    if (player.placeEffect) {
      player.placeEffect.tick(
        this.resources,
        playerMesh.animationMixer.time,
        commonEffects.placeParticleTexture
      );
    }
  }

  private updateSingleParticleEffect({
    particleSystem,
    setParticleSystem,
    particleSystemMaterials,
    shouldBeginParticles,
    shouldEndParticles,
    renderablePlayer,
    endParticlesDelaySeconds = 0,
  }: {
    particleSystem?: ParticleSystem;
    setParticleSystem: (p: ParticleSystem | undefined) => void;
    particleSystemMaterials: ParticleSystemMaterials;
    shouldBeginParticles: boolean;
    shouldEndParticles: boolean;
    renderablePlayer: RenderablePlayer;
    endParticlesDelaySeconds?: number;
  }) {
    const clock = this.resources.get("/clock");

    const { scenePlayer } = renderablePlayer;
    if (!particleSystem && shouldBeginParticles) {
      setParticleSystem(
        new ParticleSystem(particleSystemMaterials, clock.time)
      );
    }

    if (particleSystem) {
      particleSystem.three.position.fromArray(scenePlayer.position);
      particleSystem.tickToTime(clock.time, [0, 1, 0]);

      if (shouldEndParticles && !particleSystem.pausingOrPaused()) {
        particleSystem.pauseAt(clock.time + endParticlesDelaySeconds);
      }

      if (particleSystem.allAnimationsComplete()) {
        particleSystem.materials.dispose();
        setParticleSystem(undefined);
      }
    }
  }

  draw(scenes: Scenes, dt: number) {
    // Add the local player.
    const tweaks = this.resources.get("/tweaks");
    const camera = this.resources.get("/scene/camera");

    const renderablePlayers = this.getRenderablePlayers();

    renderablePlayers.forEach((x) =>
      this.updatePlayerThree(x.player, x.playerMesh, dt, camera, x.localPlayer)
    );

    this.addPlayersToScene(renderablePlayers, tweaks, camera, scenes, dt);
  }

  private getRenderablePlayers(): RenderablePlayer[] {
    const localPlayer = this.resources.get("/scene/local_player");
    const showGremlins =
      this.authManager.currentUser.hasSpecialRole("seeGremlins") &&
      this.resources.get("/tweaks").showGremlins;
    const players: Array<RenderablePlayer> = [];
    const camera = this.resources.get("/scene/camera");
    const maybeRenderPlayer = (entity: ReadonlyEntity) => {
      const player = this.resources.get("/sim/player", entity.id);
      const scenePlayer = this.resources.get("/scene/player", entity.id);
      if (!player || !player.initialized) {
        return;
      }
      if (!showGremlins && entity.gremlin) {
        return;
      }
      const playerMesh = this.resources.cached("/scene/player/mesh", player.id);
      if (playerMesh) {
        players.push({
          ecsPlayer: entity,
          player,
          scenePlayer,
          playerMesh,
          localPlayer: localPlayer.id === player.id ? localPlayer : undefined,
        });
      }
    };

    // Ensure local player is always rendered.
    const localPlayerEntity = this.resources.get("/ecs/entity", localPlayer.id);
    if (localPlayerEntity) {
      maybeRenderPlayer(localPlayerEntity);
    }
    for (const entity of this.table.scan(
      PlayerSelector.query.spatial.inSphere(camera.frustumBoundingSphere, {
        approx: true,
      })
    )) {
      if (entity.id === localPlayer.id) {
        // We ensure local player is rendered already, skip it here.
        continue;
      }
      maybeRenderPlayer(entity);
    }
    return players;
  }

  private renderablePlayerToRenderable(
    tweaks: TweakableConfig,
    player: RenderablePlayer
  ) {
    let aabb = playerAABB(
      player.playerMesh.three.position.toArray(),
      player.player.scale
    );
    if (playerTakingSelfie(this.resources, player)) {
      aabb = growAABB(
        aabb,
        Math.abs(tweaks.inGameCamera.selfie.offsetBack) + 1
      );
    }
    return {
      aabb,
      payload: player,
      id: player.player.id,
    };
  }

  private addPlayersToScene(
    renderablePlayers: RenderablePlayer[],
    tweaks: TweakableConfig,
    camera: Camera,
    scenes: Scenes,
    dt: number
  ) {
    numPlayersCval.value = renderablePlayers.length;

    const renderables: Renderable<RenderablePlayer>[] = renderablePlayers.map(
      (x) => this.renderablePlayerToRenderable(tweaks, x)
    );

    const playersToRender = cullEntities(
      renderables,
      camera,
      drawLimitValueWithTweak(
        this.resources,
        tweaks.clientRendering.remotePlayerRenderLimit
      )
    );

    numRenderedPlayersCval.value = playersToRender.length;

    timeCode("remotePlayerAnimations", () => {
      playersToRender.forEach((x) => {
        if (x.player && x.playerMesh) {
          const isGremlin = this.resources.get("/ecs/c/gremlin", x.player.id);
          const playerHealth = this.resources.get("/ecs/c/health", x.player.id);
          let skipAnimations = false;
          if (!isGremlin && playerHealth && playerHealth.hp <= 0) {
            skipAnimations = true;
          }

          if (!skipAnimations) {
            this.updateAnimations(x, dt);
            this.updateParticleEffects(x);
            this.updateSkinColorEffects(x);
          }

          if (!x.localPlayer || !camera.isFirstPerson) {
            this.updateSelectedAttachment(x, scenes);
            addToScenes(scenes, x.playerMesh.three);
            if (x.player.healingParticleEffect) {
              addToScenes(scenes, x.player.healingParticleEffect.three);
            }
            if (x.player.warpParticleEffect) {
              addToScenes(scenes, x.player.warpParticleEffect.three);
            }
            for (const buffId of Object.keys(
              x.player.buffParticleEffects
            ) as unknown as BiomesId[]) {
              const particleEffect = x.player.buffParticleEffects[buffId];
              if (particleEffect) {
                addToScenes(scenes, particleEffect.three);
              }
            }
            x.player.placeEffect?.addToScenes(scenes);
          }
        }
      });
    });
  }

  updateThrowAttachment(
    throwInfo: ReadonlyEmoteThrowInfo,
    attachedItem: ReadonlyItem | undefined,
    renderablePlayer: RenderablePlayer,
    scenes: Scenes
  ) {
    const clock = this.resources.get("/clock");
    const { player, playerMesh } = renderablePlayer;

    const sky = this.resources.get("/scene/sky_params");
    const spatialLighting = player.getSpatialLighting();
    playerMesh.itemAttachment.updateAttachedItem(
      this.resources,
      attachedItem,
      spatialLighting,
      sky.sunDirection.toArray()
    );

    const t = clock.time - (player.emoteInfo?.emoteStartTime ?? 0);
    const lineEndPosition = physicsHookPosition(
      throwInfo.physics.start,
      throwInfo.physics.velocity,
      throwInfo.physics.gravity,
      t
    );

    const meshScale = 0.02;

    const itemMeshFactory = this.resources.cached(
      "/scene/item/mesh",
      new ItemMeshKey(anItem(BikkieIds.muckBuster))
    );

    if (itemMeshFactory) {
      const itemMesh = itemMeshFactory();
      itemMesh.three.traverse((obj) => {
        if (
          obj instanceof THREE.Mesh &&
          obj.material instanceof BasePassMaterial
        ) {
          updateBasicMaterial(obj.material, {
            light: sky.sunDirection.toArray(),
            spatialLighting,
          });
        }
      });
      itemMesh.three.position.set(...lineEndPosition);
      itemMesh.three.scale.setScalar(meshScale);
      if (throwInfo.angular_velocity) {
        itemMesh.three.setRotationFromQuaternion(
          getCamOrientation([
            t * throwInfo.angular_velocity[0],
            t * throwInfo.angular_velocity[1],
          ])
        );
      }
      addToScenes(scenes, itemMesh.three);
    }
  }

  updateFishingAttachment(
    fishingInfo: ReadonlyEmoteFishingInfo,
    attachedItem: ReadonlyItem | undefined,
    renderablePlayer: RenderablePlayer,
    scenes: Scenes
  ) {
    const clock = this.resources.get("/clock");
    const { player, playerMesh } = renderablePlayer;

    const sky = this.resources.get("/scene/sky_params");
    const spatialLighting = player.getSpatialLighting();
    const itemUpdate = playerMesh.itemAttachment.updateAttachedItem(
      this.resources,
      attachedItem,
      spatialLighting,
      sky.sunDirection.toArray()
    );

    // Attach line to top of rod
    const itemAttachmentPos = new Vector3();
    if (itemUpdate) {
      itemAttachmentPos.set(
        0, // toward or away from player
        45, // long axis
        -5 // lateral axis
      );
      itemAttachmentPos.applyMatrix4(itemUpdate.three.matrixWorld);
    }

    let lineEndPosition: Vec3 | undefined;
    switch (fishingInfo.line_end_position?.kind) {
      case "fixed":
        lineEndPosition = [...fishingInfo.line_end_position.pos];
        break;

      case "physics":
        {
          const t = clock.time - (player.emoteInfo?.emoteStartTime ?? 0);
          lineEndPosition = physicsHookPosition(
            fishingInfo.line_end_position.start,
            fishingInfo.line_end_position.velocity,
            fishingInfo.line_end_position.gravity,
            t
          );
        }
        break;

      case "reel_in":
        {
          const t =
            1.0 -
            (clock.time - (player.emoteInfo?.emoteStartTime ?? 0)) /
              fishingInfo.line_end_position.duration;
          lineEndPosition = interp(
            itemAttachmentPos.toArray(),
            fishingInfo.line_end_position.start,
            t
          );
        }
        break;
    }

    if (itemUpdate && lineEndPosition) {
      this.resources.set("/scene/fishing_line_points", player.id, {
        value: [itemAttachmentPos.toArray(), lineEndPosition],
      });
      const lineMesh = this.resources.get(
        "/scene/fishing_line_mesh",
        player.id
      );
      if (lineMesh.value) {
        addToScenes(scenes, lineMesh.value);
      }
    }

    if (lineEndPosition && fishingInfo.line_end_item) {
      const meshScale = 0.02;

      const itemMeshFactory = this.resources.cached(
        "/scene/item/mesh",
        new ItemMeshKey(fishingInfo.line_end_item)
      );

      if (itemMeshFactory) {
        const itemMesh = itemMeshFactory();
        itemMesh.three.traverse((obj) => {
          if (
            obj instanceof THREE.Mesh &&
            obj.material instanceof BasePassMaterial
          ) {
            updateBasicMaterial(obj.material, {
              light: sky.sunDirection.toArray(),
              spatialLighting,
            });
          }
        });
        itemMesh.three.position.set(...sub(lineEndPosition, [-0.05, 0.1, 0]));
        itemMesh.three.scale.setScalar(meshScale);
        addToScenes(scenes, itemMesh.three);
      }
    }
  }

  updateSelectedAttachment(renderablePlayer: RenderablePlayer, scenes: Scenes) {
    // Add the current equipped preview mesh.
    const { ecsPlayer, localPlayer, player, playerMesh } = renderablePlayer;

    const clock = this.resources.get("/clock");
    const selectedItem = localPlayer
      ? this.resources.get("/hotbar/selection").item
      : ecsPlayer.selected_item?.item?.item;

    const becomeNpc = this.resources.get("/scene/npc/become_npc");
    const robotComponent =
      becomeNpc.kind === "active"
        ? this.resources.get("/ecs/c/robot_component", becomeNpc.entityId)
        : undefined;

    const selectedItemActionAllowed =
      !localPlayer ||
      this.permissionsManager.itemActionAllowed(
        selectedItem,
        ...this.resources.get("/player/effective_acl").acls
      );
    const allowedItem = selectedItemActionAllowed ? selectedItem : undefined;

    const attachedItem = robotComponent
      ? anItem(BikkieIds.remoteControl)
      : player.isEmoting(clock.time)
      ? player.emoteItemOverride(allowedItem, clock.time)
      : allowedItem;

    if (playerTakingSelfie(this.resources, renderablePlayer)) {
      // Don't show the camera in the player's hands if they're taking a selfie.
      playerMesh.itemAttachment.updateAttachedItem(this.resources, undefined);
      if (!localPlayer) {
        // If a remote player is taking a selfie, render their camera floating
        // in the air.
        addFloatingSelfieCamMesh(
          this.table,
          this.resources,
          player,
          playerMesh,
          scenes
        );
      }
    } else if (
      player.emoteInfo?.richEmoteComponents?.fishing_info &&
      playerFishing(this.resources, renderablePlayer)
    ) {
      this.updateFishingAttachment(
        player.emoteInfo.richEmoteComponents.fishing_info,
        attachedItem,
        renderablePlayer,
        scenes
      );
    } else if (player.emoteInfo?.richEmoteComponents?.throw_info) {
      this.updateThrowAttachment(
        player.emoteInfo.richEmoteComponents.throw_info,
        attachedItem,
        renderablePlayer,
        scenes
      );
    } else {
      const sky = this.resources.get("/scene/sky_params");
      const spatialLighting = player.getSpatialLighting();
      playerMesh.itemAttachment.updateAttachedItem(
        this.resources,
        attachedItem,
        spatialLighting,
        sky.sunDirection.toArray()
      );
    }
  }
}

function addFloatingSelfieCamMesh(
  table: ClientTable,
  resources: ClientResources,
  player: Player,
  mesh: LoadedPlayerMesh,
  scenes: Scenes
) {
  const cameraFactory = resources.cached(
    "/scene/item/mesh",
    new ItemMeshKey(anItem(BikkieIds.camera))
  );
  if (cameraFactory) {
    const tweaks = resources.get("/tweaks");
    const selfieTweaks = tweaks.inGameCamera["selfie"];
    const cameraMesh = cameraFactory();

    const sky = resources.get("/scene/sky_params");
    const spatialLighting = player.getSpatialLighting();
    cameraMesh.three.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.material instanceof BasePassMaterial
      ) {
        updateBasicMaterial(obj.material, {
          light: sky.sunDirection.toArray(),
          spatialLighting,
        });
      }
    });
    const position = clippedThirdPersonCamPositionWithCollision(
      table,
      resources,
      player.id,
      playerFirstPersonCamPosition(player.position, player.aabb()),
      thirdPersonCamPosition(
        player.orientation,
        camOffsetVector(selfieTweaks),
        playerFirstPersonCamPosition(player.position, player.aabb())
      )
    );
    const orientation = getCamOrientation(
      player.orientation,
      selfieTweaks.reverse ? 1.0 : 0.0
    );

    const cameraTransform = new THREE.Matrix4().makeRotationFromQuaternion(
      orientation
    );
    // Set the scale of the camera item according to the same scale that would
    // be used if the item was held in the player's hand.
    const characterScale = new THREE.Vector3().setFromMatrixScale(
      mesh.threeWeaponAttachment.matrixWorld
    );
    cameraTransform.scale(characterScale);

    cameraTransform.setPosition(...position);
    cameraMesh.three.applyMatrix4(cameraTransform);
    addToScenes(scenes, cameraMesh.three);
  }
}

function playerTakingSelfie(
  resources: ClientResources,
  renderablePlayer: RenderablePlayer
) {
  const selectedItem = renderablePlayer.localPlayer
    ? resources.get("/hotbar/selection").item
    : renderablePlayer.ecsPlayer.selected_item?.item?.item;
  return (
    selectedItem?.id === BikkieIds.camera &&
    renderablePlayer.ecsPlayer.player_behavior?.camera_mode === "selfie"
  );
}

function playerFishing(
  resources: ClientResources,
  renderablePlayer: RenderablePlayer
) {
  const selectedItem = renderablePlayer.localPlayer
    ? resources.get("/hotbar/selection").item
    : renderablePlayer.ecsPlayer.selected_item?.item?.item;
  return selectedItem?.action === "fish";
}
