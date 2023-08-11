// @refresh reset

import type { ClientConfig } from "@/client/game/client_config";
import { BasePassMaterial } from "@/client/game/renderers/base_pass_material";
import { ColorCorrectionPass } from "@/client/game/renderers/passes/color_correction";
import { CombinePass } from "@/client/game/renderers/passes/combine";
import { makeStandardScenePasses } from "@/client/game/renderers/passes/standard_passes";
import type { Scenes } from "@/client/game/renderers/scenes";
import { addToScene, createNewScenes } from "@/client/game/renderers/scenes";
import { defaultSpatialLighting } from "@/client/game/renderers/util";
import type { ClientResources } from "@/client/game/resources/types";
import { PassRenderer } from "@/client/renderer/pass_renderer";
import { ok } from "assert";
import { isEqual } from "lodash";
import type { PropsWithChildren } from "react";
import React from "react";
import * as THREE from "three";
import { Mesh, SkinnedMesh } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

interface ThreeObjectPreviewProps {
  object: THREE.Object3D | THREE.Mesh;
  autoRotate?: boolean;
  allowRotate?: boolean;
  allowZoom?: boolean;
  allowPan?: boolean;
  cameraPos?: THREE.Vector3;
  cameraFOV?: number;
  controlTarget?: THREE.Vector3;
  animationMixer?: THREE.AnimationMixer;
  controls?: boolean;
  animate?: boolean;
  onClick?: (e: MouseEvent) => any;
  clientConfig?: ClientConfig;
  resources?: ClientResources;
  renderScale?: number;
}

export function defaultObjectCameraRadius(object: THREE.Object3D | THREE.Mesh) {
  let radius = 10;
  if (object && object instanceof THREE.Mesh) {
    object.geometry.computeBoundingSphere();
    radius = (object.geometry.boundingSphere?.radius || 10) * 3;
  } else if (object) {
    const size = new THREE.Vector3();

    // This breaks for SkinnedMesh for some reason...
    //const bbox = new THREE.Box3().setFromObject(object);

    // Hack for now...
    const bbox = new THREE.Box3();
    object.traverse((child) => {
      if (!(child instanceof SkinnedMesh) && child instanceof Mesh) {
        bbox.expandByObject(child);
      }
    });

    bbox.getSize(size);
    radius = Math.max(size.x, size.y, size.z) * 3;
  }
  return radius;
}

export class ThreeObjectPreview extends React.Component<
  PropsWithChildren<ThreeObjectPreviewProps>,
  {}
> {
  threeMountRef = React.createRef<HTMLDivElement>();

  public passRenderer?: PassRenderer;
  public camera!: THREE.PerspectiveCamera;
  public scenes?: Scenes;
  private controls!: OrbitControls;
  private animationFrameId?: number;

  private onMouseDown?: (e: MouseEvent) => any;
  private onMouseUp?: (e: MouseEvent) => any;

  static defaultProps = { animate: true, controls: true };
  domElement() {
    return this.passRenderer?.canvas;
  }

  defaultCameraPos() {
    if (this.props.cameraPos) {
      return this.props.cameraPos;
    }

    const radius = defaultObjectCameraRadius(this.props.object);
    return new THREE.Vector3().setFromSphericalCoords(
      radius,
      THREE.MathUtils.degToRad(45),
      -THREE.MathUtils.degToRad(0)
    );
  }

  applyNeutralSpatialLighting() {
    if (!this.scenes) {
      return;
    }
    for (const scene of [this.scenes.base, this.scenes.three]) {
      scene.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.material instanceof BasePassMaterial
        ) {
          // TODO: Generalize this update across different types of materials
          child.material.uniforms.light = { value: [1, 1, 0] };
          child.material.uniforms.spatialLighting = {
            value: defaultSpatialLighting(),
          };
        }
      });
    }
  }

  private initializeRenderer() {
    ok(this.threeMountRef.current);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.2, 2000);

    camera.position.copy(this.defaultCameraPos());
    this.camera = camera;

    if (this.props.cameraFOV) {
      camera.fov = this.props.cameraFOV;
    }

    const scenes = createNewScenes();
    this.scenes = scenes;
    const color = 0xffffff;
    const intensity = 0.7;
    const light = new THREE.AmbientLight(color, intensity);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(10000, 10000, 10000);
    addToScene(scenes.three, dirLight);
    addToScene(scenes.three, light);
    addToScene(scenes.three, this.props.object);
    scenes.three.background = null;
    const box = new THREE.Box3().setFromObject(scenes.three);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Show bounding box for debugging
    // const boundingBox = new THREE.BoxHelper(this.props.object, 0xff0000);
    // addToScene(scenes.three, boundingBox);

    const getCamera = () => camera;
    this.passRenderer = new PassRenderer(
      "ThreeObjectPreview",
      makeStandardScenePasses({ getCamera }, scenes),
      {
        onCanvasResized: this.onCanvasResized,
      }
    );
    this.passRenderer.setPostprocesses([
      new CombinePass("combine"),
      new ColorCorrectionPass("color_correction"),
    ]);

    this.passRenderer.setPixelRatio(
      this.props.renderScale ?? window.devicePixelRatio
    );
    this.threeMountRef.current.appendChild(this.passRenderer.canvas);
    this.passRenderer.canvas.style.width = "100%";
    this.passRenderer.canvas.style.height = "100%";

    const controls = new OrbitControls(camera, this.passRenderer.canvas);
    if (this.props.controlTarget) {
      controls.target.copy(this.props.controlTarget);
    } else {
      controls.target.copy(center);
    }
    controls.enabled = !!this.props.controls;
    controls.autoRotate = !!this.props.autoRotate;
    controls.enableZoom = !!this.props.allowZoom;
    controls.enablePan = !!this.props.allowPan;
    controls.enableRotate = this.props.allowRotate ?? true;
    this.controls = controls;

    // add click event
    let mouseDownPos = [0, 0];
    const MAX_DIST = 2;
    const onClick = this.props.onClick;
    let timeout: NodeJS.Timeout;
    this.onMouseDown = (e: MouseEvent) => {
      mouseDownPos = [e.clientX, e.clientY];
      controls.autoRotate = false;
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        controls.autoRotate = !!this.props.autoRotate;
      }, 3000);
    };
    this.onMouseUp = (e: MouseEvent) => {
      if (
        Math.abs(e.clientX - mouseDownPos[0]) <= MAX_DIST &&
        Math.abs(e.clientY - mouseDownPos[1]) <= MAX_DIST
      ) {
        onClick?.(e);
      }
    };
    this.passRenderer.canvas.addEventListener("mousedown", this.onMouseDown);
    this.passRenderer.canvas.addEventListener("mouseup", this.onMouseUp);
  }

  private shutdownRenderer() {
    if (this.threeMountRef && this.threeMountRef.current && this.passRenderer) {
      this.threeMountRef.current.removeChild(this.passRenderer.canvas);
    }

    this.passRenderer?.canvas.removeEventListener(
      "mousedown",
      this.onMouseDown!
    );
    this.passRenderer?.canvas.removeEventListener("mouseup", this.onMouseUp!);

    this.controls.dispose();
    this.passRenderer?.shutdown();
    this.passRenderer = undefined;
  }

  componentDidMount() {
    if (!this.threeMountRef.current) {
      return;
    }

    this.initializeRenderer();
    this.startRenderLoop();
  }

  componentDidUpdate(prevProps: Readonly<ThreeObjectPreviewProps>) {
    if (!this.scenes) {
      return;
    }
    if (prevProps.object !== this.props.object) {
      this.scenes.three.remove(prevProps.object);
      addToScene(this.scenes.three, this.props.object);
    }
    if (!isEqual(prevProps.controlTarget, this.props.controlTarget)) {
      if (this.props.controlTarget) {
        this.controls.target.copy(this.props.controlTarget);
      } else {
        const box = new THREE.Box3().setFromObject(this.scenes.three);
        const center = new THREE.Vector3();
        box.getCenter(center);
        this.controls.target.copy(center);
      }
    }
  }

  componentWillUnmount() {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    this.shutdownRenderer();
  }

  startRenderLoop() {
    const clock = new THREE.Clock();
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      const hasVisibleCanvas = this.threeMountRef.current?.clientHeight;
      if (!hasVisibleCanvas) {
        if (this.passRenderer) {
          this.shutdownRenderer();
          ok(!this.passRenderer);
        }
        return;
      }
      if (!this.passRenderer) {
        this.initializeRenderer();
        if (!this.passRenderer) {
          throw new Error(`Started render loop without required objects`);
        }
      }

      const { controls, passRenderer } = this;
      if (this.props.animationMixer) {
        this.props.animationMixer.update(
          this.props.animate ? clock.getDelta() : 0
        );
      }
      controls.update();
      this.applyNeutralSpatialLighting();
      passRenderer?.render();
    };
    animate();
  }

  private onCanvasResized = (width: number, height: number) => {
    const { camera } = this;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  renderScreenshot(
    width: number,
    height: number,
    format: "image/png" | "image/jpeg" | "image/webp" = "image/png",
    options: {
      cameraAdjustSphereAngle?: THREE.Vector2;
      cameraSetPosition?: THREE.Vector3;
      cameraAdjustTarget?: THREE.Vector3;
      cameraSetFOV?: number;
    } = {}
  ) {
    if (!this.passRenderer || !this.scenes || !this.camera || !this.controls) {
      return undefined;
    }

    const oldSpherical = new THREE.Spherical();
    oldSpherical.setFromCartesianCoords(
      this.camera?.position.x,
      this.camera?.position.y,
      this.camera?.position.z
    );
    const oldTarget = new THREE.Vector3().copy(this.controls.target);
    const oldAspect = this.camera.aspect;
    const oldFOV = this.camera.fov;

    this.camera.aspect = width / height;
    if (options.cameraSetFOV) {
      this.camera.fov = options.cameraSetFOV;
    }
    this.camera.updateProjectionMatrix();

    if (options.cameraAdjustSphereAngle) {
      this.camera.position.setFromSphericalCoords(
        oldSpherical.radius,
        options.cameraAdjustSphereAngle.x,
        options.cameraAdjustSphereAngle.y
      );
    } else if (options.cameraSetPosition) {
      this.camera.position.copy(options.cameraSetPosition);
    }

    if (options.cameraAdjustTarget) {
      this.controls.target.copy(options.cameraAdjustTarget);
    }
    this.controls.update();
    const screenshot = this.passRenderer.screenshot({ width, height, format });

    this.controls.target.copy(oldTarget);
    //this.passRenderer.setCanvasSize(...oldSize);
    this.camera.position.setFromSpherical(oldSpherical);
    this.camera.fov = oldFOV;
    this.camera.aspect = oldAspect;
    this.camera.updateProjectionMatrix();
    this.controls.update();
    return screenshot.screenshotDataUri;
  }

  render() {
    return (
      <div className="three-object-preview-wrapper" ref={this.threeMountRef}>
        {this.props.children}
      </div>
    );
  }
}
