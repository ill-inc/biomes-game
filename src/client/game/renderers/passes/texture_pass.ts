import type { RenderPassName } from "@/client/game/renderers/passes/composer";
import { ShaderPass } from "@/client/game/renderers/passes/shader_pass";
import { CopyShader } from "three/examples/jsm/shaders/CopyShader";

export class TexturePass extends ShaderPass {
  texture: THREE.Texture;
  constructor(name: RenderPassName, texture: THREE.Texture) {
    super(name, CopyShader, { inputs: [] });
    this.texture = texture;
  }

  updateParameters(
    _deltaTime: number,
    _inputs: Map<string, THREE.Texture | undefined>
  ) {
    this.uniforms.tDiffuse.value = this.texture;
  }
}
