import { DepthVisualizePass } from "@/client/game/renderers/passes/depth_visualize";
import { ShaderPass } from "@/client/game/renderers/passes/shader_pass";
import { TexturePass } from "@/client/game/renderers/passes/texture_pass";
import * as THREE from "three";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader";

export function makeVisualizeNormalsPass() {
  return new ShaderPass("normal", CopyShader, {
    inputs: ["normal"],
  });
}

export function makeVisualizeDepthPass(
  getCamera: () => THREE.PerspectiveCamera
) {
  return new DepthVisualizePass("depth", "depth", getCamera);
}

export function makeVisualizeDepthPrePass(
  getCamera: () => THREE.PerspectiveCamera
) {
  return new DepthVisualizePass("depth", "depthPre", getCamera);
}

export function makeVisualizeBaseDepthPass(
  getCamera: () => THREE.PerspectiveCamera
) {
  return new DepthVisualizePass("depth", "baseDepth", getCamera);
}

export function makeVisualizeSecondaryColorPass() {
  return new ShaderPass("secondarycolor", CopyShader, {
    inputs: ["secondaryColor"],
  });
}

export function makeTextureDebugPass() {
  const loader = new THREE.TextureLoader();
  const texture = loader.load("textures/debug/uv.jpg");
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return new TexturePass("textureDebug", texture);
}
