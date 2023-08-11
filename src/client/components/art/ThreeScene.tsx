import { CombinePass } from "@/client/game/renderers/passes/combine";
import {
  makeStandardPostprocessingPipeline,
  makeStandardScenePasses,
} from "@/client/game/renderers/passes/standard_passes";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScenes } from "@/client/game/renderers/scenes";
import { PassRenderer } from "@/client/renderer/pass_renderer";
import type { Vec3 } from "@/shared/math/types";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

function loopOnAnimationFrame(fn: () => void) {
  let id: number | undefined = undefined;
  const loop = () => {
    fn();
    id = requestAnimationFrame(loop);
  };
  loop();
  return () => {
    if (id) {
      cancelAnimationFrame(id);
    }
  };
}

export const ThreeScene: React.FunctionComponent<{
  scenes: Scenes;
  cameraPos: Vec3;
  axesPos?: Vec3;
}> = ({ scenes, cameraPos, axesPos }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scenesRef = useRef<Scenes>(scenes);

  scenesRef.current = scenes;

  // Add the helper
  if (axesPos) {
    const axes = new THREE.AxesHelper(2);
    axes.position.set(...axesPos);
    addToScenes(scenes, axes);
  }

  useEffect(() => {
    const canvas = canvasRef.current!;

    // Initialize the rendering context.
    const camera = new THREE.PerspectiveCamera(45, 1, 1, 1000);
    const controls = new OrbitControls(camera, canvas);
    camera.position.set(...cameraPos);
    camera.up.set(0, 1, 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    const scenePasses = makeStandardScenePasses(
      {
        getCamera: () => camera,
      },
      scenesRef.current
    );
    const passRenderer = new PassRenderer("ArtToolScene", scenePasses, {
      canvas,
      onCanvasResized: (width, height) => {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      },
    });
    passRenderer.setPostprocesses([
      ...makeStandardPostprocessingPipeline(() => camera),
      new CombinePass("combine"),
    ]);

    // Schedule rendering loop and cleanup.
    const dispose = loopOnAnimationFrame(() => passRenderer.render());
    setTimeout(() => (canvas.hidden = false)); // Hack to avoid flicker.

    return () => {
      dispose();
      controls.dispose();
      passRenderer.shutdown();
    };
  }, [scenes]);

  return (
    <canvas
      ref={canvasRef}
      tabIndex={0}
      hidden={true}
      style={{ width: "100%", height: "100%" }}
    />
  );
};
