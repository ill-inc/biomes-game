import type { RenderPassName } from "@/client/game/renderers/passes/composer";
import { ShaderPass } from "@/client/game/renderers/passes/shader_pass";
import {
  checkCombineHotReload,
  makeCombineMaterial,
} from "@/gen/client/game/shaders/postprocessing/combine";

export class CombinePass extends ShaderPass {
  constructor(name: RenderPassName) {
    const shader = makeCombineMaterial({});
    super(name, shader, {
      beforeRender: () => checkCombineHotReload(shader),
      // TODO: Doing color before luts gives weird artifacts in the luts
      inputs: ["color", "secondaryColor", "translucency"],
      outputs: ["color"],
    });
  }
}
