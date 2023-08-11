import type { ClientContextSubset } from "@/client/game/context";
import type { RenderPassName } from "@/client/game/renderers/passes/composer";
import { ShaderPass } from "@/client/game/renderers/passes/shader_pass";
import type { ClientResources } from "@/client/game/resources/types";
import {
  checkSkyColorDebugHotReload,
  makeSkyColorDebugMaterial,
} from "@/gen/client/game/shaders/postprocessing/sky_color_debug";
import {
  checkSkyColorMultipleScatteringHotReload,
  makeSkyColorMultipleScatteringMaterial,
} from "@/gen/client/game/shaders/postprocessing/sky_color_multiple_scattering";
import {
  checkSkyColorSkyMapHotReload,
  makeSkyColorSkyMapMaterial,
} from "@/gen/client/game/shaders/postprocessing/sky_color_sky_map";
import {
  checkSkyColorTransmittanceHotReload,
  makeSkyColorTransmittanceMaterial,
} from "@/gen/client/game/shaders/postprocessing/sky_color_transmittance";
import * as THREE from "three";

export class SkyColorTransmittanceLUT extends ShaderPass {
  rendered: boolean;

  constructor(name: RenderPassName) {
    const shader = makeSkyColorTransmittanceMaterial({});
    super(name, shader, {
      beforeRender: () => {
        if (checkSkyColorTransmittanceHotReload(shader)) {
          this.rendered = false;
        }
      },
      inputs: [],
      outputs: ["skyColorTransmittanceLUT"],
      clearState: {
        color: [0, 0, 0, 0],
      },
    });
    this.rendered = false;
  }

  computeBufferSize(vec2?: THREE.Vector2): THREE.Vector2 {
    vec2 = vec2 || new THREE.Vector2();
    vec2.width = 256;
    vec2.height = 64;
    return vec2;
  }

  generateBuffers(renderToScreen: boolean) {
    this.outputs.clear();
    if (!this.composer) {
      return;
    }
    if (!renderToScreen) {
      const size = this.computeBufferSize();
      const target = new THREE.WebGLRenderTarget(size.width, size.height);
      target.texture.format = THREE.RGBAFormat;
      target.texture.type = THREE.HalfFloatType;
      target.texture.minFilter = THREE.LinearFilter;
      target.texture.magFilter = THREE.LinearFilter;
      target.texture.generateMipmaps = false;
      target.stencilBuffer = false;
      target.depthBuffer = false;
      this.target = target;

      this.outputs.set("skyColorTransmittanceLUT", target.texture);
    }
    this.rendered = false;
  }

  resizeBuffers() {
    this.rendered = false;
    return;
  }

  render(deltaTime: number, toScreen: boolean = false) {
    this.beforeRender?.();

    if (this.rendered || !this.needsRender) {
      return false;
    }
    const rendered = super.render(deltaTime, toScreen);
    // Render once unless rendering to screen
    this.rendered = rendered && !toScreen && this.target !== undefined;
    return rendered;
  }
}

export class SkyColorMultipleScatteringLUT extends ShaderPass {
  rendered: boolean;
  constructor(name: RenderPassName) {
    const shader = makeSkyColorMultipleScatteringMaterial({
      // See comment in the code around this uniform, but by setting it to 0,
      // we are "commenting out" this shader stage.
      scaleOutput: 0.0,
    });
    super(name, shader, {
      beforeRender: () => {
        if (checkSkyColorMultipleScatteringHotReload(shader)) {
          this.rendered = false;
        }
      },
      inputs: ["skyColorTransmittanceLUT"],
      outputs: ["skyColorMultipleScatteringLUT"],
    });
    this.rendered = false;
  }

  computeBufferSize(vec2?: THREE.Vector2): THREE.Vector2 {
    vec2 = vec2 || new THREE.Vector2();
    vec2.width = 32;
    vec2.height = 32;
    return vec2;
  }

  generateBuffers(renderToScreen: boolean) {
    this.outputs.clear();
    if (!this.composer) {
      return;
    }
    if (!renderToScreen) {
      const size = this.computeBufferSize();
      const target = new THREE.WebGLRenderTarget(size.width, size.height);
      target.texture.format = THREE.RGBAFormat;
      target.texture.type = THREE.HalfFloatType;
      target.texture.minFilter = THREE.LinearFilter;
      target.texture.magFilter = THREE.LinearFilter;
      target.texture.generateMipmaps = false;
      target.stencilBuffer = false;
      target.depthBuffer = false;
      this.target = target;

      this.outputs.set("skyColorMultipleScatteringLUT", target.texture);
    }
    this.rendered = false;
  }

  resizeBuffers() {
    this.rendered = false;
    return;
  }

  render(deltaTime: number, toScreen: boolean = false) {
    this.beforeRender?.();

    if (this.rendered || !this.needsRender) {
      return false;
    }
    // Only render if input transmittancelut was rendered
    const transmittanceInput = this.inputs.get("skyColorTransmittanceLUT");
    if (transmittanceInput && transmittanceInput[0]) {
      const transmittancePass =
        transmittanceInput[0] as SkyColorTransmittanceLUT;
      if (!transmittancePass.rendered) {
        return false;
      }
    }
    const rendered = super.render(deltaTime, toScreen);
    // Render once unless rendering to screen
    this.rendered = rendered && !toScreen && this.target !== undefined;
    return rendered;
  }
}

export class SkyColorSkyMapLUT extends ShaderPass {
  camera: THREE.PerspectiveCamera;

  constructor(
    private readonly deps: ClientContextSubset<"resources">,
    name: RenderPassName,
    camera: THREE.PerspectiveCamera
  ) {
    const shader = makeSkyColorSkyMapMaterial({
      worldCameraPosition: [0, 0, 0],
      sunDirection: [0, 0, 1],
      skyGroundOffset: 0,
      skyHeightScale: 100,
    });
    // TODO: Render only when sun or position change
    super(name, shader, {
      beforeRender: () => checkSkyColorSkyMapHotReload(shader),
      inputs: ["skyColorTransmittanceLUT", "skyColorMultipleScatteringLUT"],
      outputs: ["skyColorSkyMapLUT"],
    });
    this.camera = camera;
  }

  computeBufferSize(vec2?: THREE.Vector2): THREE.Vector2 {
    vec2 = vec2 || new THREE.Vector2();
    vec2.width = 200;
    vec2.height = 200;
    return vec2;
  }

  generateBuffers(renderToScreen: boolean) {
    this.outputs.clear();
    if (!this.composer) {
      return;
    }
    if (!renderToScreen) {
      const size = this.computeBufferSize();
      const target = new THREE.WebGLRenderTarget(size.width, size.height);
      target.texture.format = THREE.RGBAFormat;
      target.texture.type = THREE.HalfFloatType;
      target.texture.minFilter = THREE.LinearFilter;
      target.texture.magFilter = THREE.LinearFilter;
      target.texture.generateMipmaps = false;
      target.stencilBuffer = false;
      target.depthBuffer = false;
      this.target = target;

      this.outputs.set("skyColorSkyMapLUT", target.texture);
    }
  }

  resizeBuffers() {
    return;
  }

  updateParameters(
    _deltaTime: number,
    _inputs: Map<string, THREE.Texture | undefined>
  ) {
    this.uniforms.worldCameraPosition.value = this.camera.position;

    const skyParams = this.deps.resources.get("/scene/sky_params");
    this.uniforms.sunDirection.value = skyParams.sunDirection;
  }
}

export class SkyColorDebug extends ShaderPass {
  camera: THREE.PerspectiveCamera;

  constructor(
    readonly resources: ClientResources,
    name: RenderPassName,
    camera: THREE.PerspectiveCamera
  ) {
    const shader = makeSkyColorDebugMaterial({
      cameraNear: 1,
      cameraFar: 1000,
      cameraUp: [0, 1, 0],
      cameraForward: [0, 0, 1],
      cameraFov: 50,
      cameraAspect: 1,
      worldCameraPosition: [0, 0, 0],
      sunDirection: [0, 0, 1],
      skyGroundOffset: 0,
      skyHeightScale: 100,
    });
    super(name, shader, {
      beforeRender: () => checkSkyColorDebugHotReload(shader),
      inputs: [
        "skyColorTransmittanceLUT",
        "skyColorMultipleScatteringLUT",
        "skyColorSkyMapLUT",
        "color",
      ],
      outputs: ["color"],
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
    const worldDirection = new THREE.Vector3();
    this.camera.getWorldDirection(worldDirection);
    this.uniforms.cameraForward.value = worldDirection;
    this.uniforms.cameraFov.value = this.camera.fov;
    this.uniforms.cameraAspect.value = this.camera.aspect;
    this.uniforms.worldCameraPosition.value = this.camera.position;

    const skyParams = this.resources.get("/scene/sky_params");
    this.uniforms.sunDirection.value = skyParams.sunDirection;
    this.uniforms.skyHeightScale.value = skyParams.heightScale;
    this.uniforms.skyGroundOffset.value = skyParams.groundOffset;
  }
}

export function makeSkyColorDebugPass(clientResources: ClientResources) {
  return new SkyColorDebug(
    clientResources,
    "skyColorDebug",
    clientResources.get("/scene/camera").three
  );
}
