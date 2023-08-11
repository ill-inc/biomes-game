import type { ClientContextSubset } from "@/client/game/context";
import type { RenderPassName } from "@/client/game/renderers/passes/composer";
import { ShaderPass } from "@/client/game/renderers/passes/shader_pass";
import {
  checkSkyfadeHotReload,
  makeSkyfadeMaterial,
} from "@/gen/client/game/shaders/postprocessing/skyfade";
import { makeSkyfadeColorCorrectionMaterial } from "@/gen/client/game/shaders/postprocessing/skyfade_color_correction";
import * as THREE from "three";
import { defaultSpatialLighting } from "@/client/game/renderers/util";

export class SkyFadePass extends ShaderPass {
  camera: THREE.PerspectiveCamera;

  constructor(
    private readonly deps: ClientContextSubset<"resources">,
    name: RenderPassName,
    camera: THREE.PerspectiveCamera,
    options?: { withColorCorrection?: boolean }
  ) {
    const makeMaterialFn = options?.withColorCorrection
      ? makeSkyfadeColorCorrectionMaterial
      : makeSkyfadeMaterial;
    const shader = makeMaterialFn({
      cameraNear: 1.0,
      cameraFar: 1000,
      cameraUp: [0, 1, 0],
      cameraForward: [0, 0, 1],
      cameraFov: 50,
      cameraAspect: 1,
      worldCameraPosition: [0, 0, 0],
      time: 0,
      fogStart: 500,
      fogEnd: 1000,
      inWater: 0,
      muckyness: 0,
      sunDirection: [1000, 1000, 1000],
      moonDirection: [1000, 1000, 1000],
      moonDirectionOffset: [1000, 1000, 1000],
      sunColor: [1, 1, 1],
      moonColor: [1, 1, 1],
      skyGroundOffset: 0,
      skyHeightScale: 100,
    });
    super(name, shader, {
      beforeRender: () => checkSkyfadeHotReload(shader),
      // TODO: Doing color before luts gives weird artifacts in the luts
      inputs: [
        "skyColorMultipleScatteringLUT",
        "skyColorSkyMapLUT",
        "color",
        "secondaryColor",
        "punchthroughColor",
        "translucency",
        "depth",
      ],
      outputs: ["color"],
    });
    this.camera = camera;
  }

  updateParameters(
    _deltaTime: number,
    _inputs: Map<string, THREE.Texture | undefined>
  ) {
    const tweaks = this.deps.resources.get("/tweaks");
    this.uniforms.cameraNear.value = this.camera.near;
    this.uniforms.cameraFar.value = this.camera.far;
    this.uniforms.cameraUp.value = this.camera.up;
    const worldDir = new THREE.Vector3();
    this.camera.getWorldDirection(worldDir);
    this.uniforms.cameraForward.value = worldDir;
    this.uniforms.cameraFov.value = this.camera.fov;
    this.uniforms.cameraAspect.value = this.camera.aspect;
    this.uniforms.worldCameraPosition.value = this.camera.position;
    this.uniforms.fogStart.value = this.camera.far * tweaks.fogStartFar;
    this.uniforms.fogEnd.value = this.camera.far;
    this.uniforms.time.value = this.composer?.clock.getElapsedTime() || 0;

    this.uniforms.cloudPattern.value =
      this.deps.resources.get("/scene/sky_noise");

    const skyParams = this.deps.resources.get("/scene/sky_params");
    this.uniforms.sunDirection.value = skyParams.sunDirection;
    this.uniforms.moonDirection.value = skyParams.moonDirection;
    this.uniforms.moonDirectionOffset.value = skyParams.moonDirectionOffset;
    this.uniforms.sunColor.value = skyParams.sunColor;
    this.uniforms.moonColor.value = skyParams.moonColor;
    this.uniforms.skyGroundOffset.value = skyParams.groundOffset;
    this.uniforms.skyHeightScale.value = skyParams.heightScale;

    const cameraEnvironment = this.deps.resources.get("/camera/environment");
    this.uniforms.inWater.value = cameraEnvironment.inWater ? 1 : 0;
    this.uniforms.muckyness.value = cameraEnvironment.muckyness.get();

    const nightLut = this.deps.resources.get("/scene/night_lut");
    this.uniforms.nightLut.value = nightLut;
    this.uniforms.nightLutSize.value = [
      nightLut.image.width,
      nightLut.image.height,
      nightLut.image.depth,
    ];
    const localPlayer = this.deps.resources.get("/scene/local_player");
    this.uniforms.playerSpatialLighting.value = tweaks.night.eyeAdaptation
      ? localPlayer.player.getEyeAdaptationSpatialLighting()
      : defaultSpatialLighting();
  }
}
