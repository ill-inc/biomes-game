import type { RenderPassChannel } from "@/client/game/renderers/passes/composer";
import { RenderPass } from "@/client/game/renderers/passes/pass";
import type { ScenePassOptions } from "@/client/game/renderers/passes/scene_pass";
import { ScenePass } from "@/client/game/renderers/passes/scene_pass";
import type { ScenePassDeps } from "@/client/game/renderers/passes/standard_passes";
import type { SceneDependencies } from "@/client/game/renderers/scenes";
import { DepthPrePass } from "@/client/game/renderers/passes/depth_pre_pass";
import type * as THREE from "three";

export class SceneWaterPass extends RenderPass {
  depthPass: DepthPrePass;
  colorPass: ScenePass;

  constructor(
    private readonly deps: ScenePassDeps,
    scenes: SceneDependencies[],
    options?: Partial<ScenePassOptions>
  ) {
    // Create two scenes, one for water with a replacement dummy material that
    // renders depth, and another for the water surface that renders color.
    super("water");

    this.depthPass = new DepthPrePass(
      deps,
      "water_depth",
      "depth",
      scenes,
      options
    );
    this.colorPass = new ScenePass(deps, "water_color", scenes, {
      sharedTarget: "secondaryColor",
      outputChannel: "secondaryColor",
      clearState: {
        color: [0, 0, 0, 0],
      },
      additionalInputs: ["depth"],
    });
  }

  generateBuffers(renderToScreen: boolean) {
    this.depthPass.composer = this.composer;
    this.colorPass.composer = this.composer;
    this.depthPass.generateBuffers(false);
    this.colorPass.generateBuffers(renderToScreen);
    const outputColor = this.colorPass.outputs.get("secondaryColor");
    const outputDepth = this.colorPass.outputs.get("depth");
    if (outputColor && !renderToScreen) {
      this.outputs.set("secondaryColor", outputColor);
      this.outputs.set("depth", outputDepth!);
    }
  }

  updateParameters(
    deltaTime: number,
    inputs: Map<string, THREE.Texture | undefined>
  ) {
    this.depthPass.updateParameters(deltaTime, inputs);
    this.colorPass.updateParameters(deltaTime, inputs);
  }

  inputChannels() {
    return [
      ...this.depthPass.inputChannels(),
      ...this.colorPass.inputChannels(),
    ];
  }

  outputChannels(): RenderPassChannel[] {
    return ["secondaryColor", "depth"];
  }

  resizeBuffers() {
    this.depthPass.resizeBuffers();
    this.colorPass.resizeBuffers();
  }

  setInput(
    name: RenderPassChannel,
    pass: RenderPass | undefined,
    outputChannel?: RenderPassChannel
  ) {
    super.setInput(name, pass, outputChannel);
    this.depthPass.setInput(name, pass, outputChannel);
    this.colorPass.setInput(name, pass, outputChannel);
  }

  render(deltaTime: number, toScreen: boolean = false) {
    this.depthPass.needsRender = this.needsRender;
    this.colorPass.needsRender = this.needsRender;
    const inputs = super.render(deltaTime, toScreen);
    this.depthPass.render(deltaTime, toScreen);
    this.colorPass.render(deltaTime, toScreen);
    return inputs;
  }
}
