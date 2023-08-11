import type { ClientContextSubset } from "@/client/game/context";
import type { RenderPassName } from "@/client/game/renderers/passes/composer";
import { ShaderPass } from "@/client/game/renderers/passes/shader_pass";
import {
  checkSkyfadeVolumeHotReload,
  makeSkyfadeVolumeMaterial,
} from "@/gen/client/game/shaders/postprocessing/skyfade_volume";
import type * as THREE from "three";

export class SkyFadeVolumePass extends ShaderPass {
  camera: THREE.PerspectiveCamera;

  constructor(
    private readonly deps: ClientContextSubset<"resources">,
    name: RenderPassName,
    camera: THREE.PerspectiveCamera
  ) {
    const shader = makeSkyfadeVolumeMaterial({
      cameraNear: 1,
      cameraFar: 1000,
      cameraUp: [0, 1, 0],
      cameraForward: [0, 0, 1],
      cameraFov: 50,
      cameraAspect: 1,
      worldCameraPosition: [0, 0, 0],
      time: 0,
      fogStart: 500,
      fogEnd: 1000,
      cloudFogStart: 1000,
      cloudFogEnd: 10000,
      timeScale: 1,
      cloudColor: [1, 0.9, 0.8, 0.7],
      cloudDensity: 11,
      planeOffset: 20,
      planeHeight: 100,
      cloudiness: 2,
      poofScale: 0.088,
      cloudScale: 0.46,
      skyColor: [135 / 255, 206 / 255, 235 / 255],
    });
    super(name, shader, {
      beforeRender: () => checkSkyfadeVolumeHotReload(shader),
      inputs: ["depth", "color"],
    });
    this.camera = camera;
  }

  updateParameters(
    _deltaTime: number,
    _inputs: Map<string, THREE.Texture | undefined>
  ) {
    this.uniforms.cameraNear.value = this.camera.near;
    this.uniforms.cameraFar.value = this.camera.far;
    this.uniforms.cameraUp.value = this.camera.up;
    this.camera.getWorldDirection(this.uniforms.cameraForward.value);
    this.uniforms.cameraFov.value = this.camera.fov;
    this.uniforms.cameraAspect.value = this.camera.aspect;
    this.uniforms.worldCameraPosition.value = this.camera.position;
    this.uniforms.fogStart.value =
      this.camera.far * this.deps.resources.get("/tweaks").fogStartFar;
    this.uniforms.fogEnd.value = this.camera.far;
    this.uniforms.time.value = this.composer?.clock.getElapsedTime() || 0;
  }
}
