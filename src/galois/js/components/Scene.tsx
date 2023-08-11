import { Checkbox } from "antd";
import "antd/dist/antd.css";
import type { PropsWithChildren } from "react";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export type SceneFactory = (dt: number, camera: THREE.Camera) => THREE.Scene;

export interface InitialCameraConfig {
  target: THREE.Vector3;
  position: THREE.Vector3;
}

interface RendererContext {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  controls: OrbitControls;
  axes: THREE.AxesHelper;
  sky: THREE.Texture;
}

function elementSize(div: HTMLElement) {
  const rect = div.getBoundingClientRect();
  return [rect.width, rect.height];
}

function fetchSkybox() {
  const ret = new THREE.CubeTextureLoader()
    .setPath("data/textures/")
    .load([
      "DR_skybox_10_Right_small.png",
      "DR_skybox_10_Left_small.png",
      "DR_skybox_10_Top_small.png",
      "DR_skybox_10_Bottom_small.png",
      "DR_skybox_10_Front_small.png",
      "DR_skybox_10_Back_small.png",
    ] as any);
  ret.internalFormat = "SRGB8_ALPHA8";
  return ret;
}

function renderLoop(fn: (t: number, dt: number) => void) {
  let id: number | undefined = undefined;
  let prev = performance.now();
  const wrapper = () => {
    const curr = performance.now();
    fn(curr / 1000, (curr - prev) / 1000);
    prev = curr;
    id = requestAnimationFrame(wrapper);
  };
  wrapper();
  return {
    dispose: () => {
      if (id) {
        cancelAnimationFrame(id);
      }
    },
  };
}

function getSceneBoundingBox(scene: THREE.Scene) {
  const box = new THREE.Box3();
  const vec3 = new THREE.Vector3();

  box.min.set(Infinity, Infinity, Infinity);
  box.max.set(-Infinity, -Infinity, -Infinity);

  scene.traverse((bone) => {
    if (bone instanceof THREE.Bone) {
      bone.updateMatrixWorld();
      vec3.setFromMatrixPosition(bone.matrixWorld);
      box.expandByPoint(vec3);
    }
  });

  if (box.min.x === Infinity) {
    // If we couldn't determine a bounding box from the skeleton, then use the
    // object itself.
    box.setFromObject(scene);
  } else {
    // Pad the bounding box produced by the skeleton, since it won't be
    // 100% accurate as it's not taking into account vertex data, just the
    // joints.
    box.expandByScalar(2);
  }

  return box;
}

// Child elements are interpreted as UI tweak widget elements.
export const Scene: React.FunctionComponent<
  PropsWithChildren<{
    factory: SceneFactory;
    initialCameraConfig?: InitialCameraConfig;
  }>
> = ({ children, factory, initialCameraConfig = undefined }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [context, setContext] = useState<RendererContext>();
  const [axes, setAxes] = useState(false);
  const [sky, setSky] = useState(false);

  useEffect(() => {
    // Initialize the canvas.
    const canvas = canvasRef.current!;

    // Initialize the canvas.
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
    });
    renderer.setClearColor(0x32353a);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Initialize the camera.
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 1, 1000);

    // Initialize the camera controls, axes, and skybox.
    const controls = new OrbitControls(camera, canvas);
    const axes = new THREE.AxesHelper(2);
    const sky = fetchSkybox();

    // Now that the new renderer is created, regenerate the component.
    setContext({ renderer, camera, canvas, controls, axes, sky });

    // Kick off initial render to avoid flicker.
    renderer.render(new THREE.Scene(), camera);

    return () => {
      sky.dispose();
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Setup the camera's initial position/orientation.
  useEffect(() => {
    if (!context) {
      return;
    }

    const { camera, controls } = context;

    // Set the camera's inital configuration, if it is specified.
    if (initialCameraConfig) {
      controls.target.copy(initialCameraConfig.target);
      camera.position.copy(initialCameraConfig.position);
    } else {
      // Setup our inital camera position and target to include all objects
      // in the scene, if no initial camera configuration was specified.
      const scene = factory(0, camera);

      const box = getSceneBoundingBox(scene);

      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      controls.target = center;
      camera.position
        .copy(new THREE.Vector3(0.5, 0.5, 1))
        .normalize()
        .multiplyScalar(size.length() * 1.5)
        .add(center);
    }
    // Apply the adjusted `controls` settings to the `camera`.
    controls.update();
    // Save state so that this is considered the camera's "reset" position.
    controls.saveState();
  }, [initialCameraConfig, context]);

  useEffect(() => {
    if (!context) {
      return;
    }

    const { renderer, camera, canvas } = context;

    // Update viewport and projection matrix when the canvas is resized.
    const resize = () => {
      const size = context.renderer.getSize(new THREE.Vector2());
      const [w, h] = elementSize(canvas.parentNode as HTMLElement);
      if (w != size.width || h != size.height) {
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    };

    // Render the scene.
    const loop = renderLoop((t) => {
      resize();
      const scene = factory(t, camera);

      // Add the coordinate frame.
      if (axes) {
        scene.add(context.axes);
      }

      // Render the skybox.
      if (sky) {
        scene.background = context.sky;
      }

      // Add some post-processing shaders.
      renderer.render(scene, camera);
    });

    return () => {
      loop.dispose();
    };
  }, [context, factory, axes, sky]);

  return (
    <div className="scene">
      <div className="options ui-overlay">
        <Checkbox onChange={(e) => setAxes(e.target.checked)}>Axes</Checkbox>
        <Checkbox onChange={(e) => setSky(e.target.checked)}>Sky</Checkbox>
        {children}
      </div>
      <canvas ref={canvasRef} tabIndex={0} />
    </div>
  );
};
