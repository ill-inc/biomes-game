// @refresh reset

import { shaderErrorCallback } from "@/client/game/renderers/renderer_controller";
import React from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

interface ThreeBasicObjectPreviewProps {
  object: THREE.Object3D | THREE.Mesh;
  autoRotate?: boolean;
  allowRotate?: boolean;
  allowZoom?: boolean;
  allowPan?: boolean;
  enableMomentum?: boolean;
  cameraPos?: THREE.Vector3;
  controlTarget?: THREE.Vector3;
  animationMixer?: THREE.AnimationMixer;
  axisLength?: number;
  overrideMaterial?: THREE.Material;
  onAnimate?: () => unknown;
}

export class ThreeBasicObjectPreview extends React.Component<
  ThreeBasicObjectPreviewProps,
  {}
> {
  threeMountRef = React.createRef<HTMLDivElement>();

  renderer?: THREE.WebGLRenderer;
  animationFrameId?: number;
  camera!: THREE.PerspectiveCamera;
  scene!: THREE.Scene;
  controls!: OrbitControls;

  domElement() {
    return this.renderer?.domElement;
  }

  defaultCameraPos() {
    if (this.props.cameraPos) {
      return this.props.cameraPos;
    }

    let radius = 10;
    if (this.props.object && this.props.object instanceof THREE.Mesh) {
      this.props.object.geometry.computeBoundingSphere();
      radius = (this.props.object.geometry.boundingSphere?.radius || 10) * 3;
    }

    return new THREE.Vector3().setFromSphericalCoords(
      radius,
      THREE.MathUtils.degToRad(45),
      -THREE.MathUtils.degToRad(0)
    );
  }

  centerObject(object: THREE.Object3D) {
    const bbox = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    object.position.copy(center);
  }

  componentDidMount() {
    if (!this.threeMountRef.current) {
      return;
    }

    const camera = new THREE.PerspectiveCamera(45, 2.0, 0.2, 2000);
    camera.position.copy(this.defaultCameraPos());
    this.camera = camera;

    this.renderer = new THREE.WebGLRenderer({ alpha: true });
    this.renderer.debug.onShaderError = shaderErrorCallback;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0xffffff, 0);
    this.threeMountRef.current.appendChild(this.renderer.domElement);

    const scene = new THREE.Scene();
    const color = 0xffffff;
    const intensity = 0.7;
    const light = new THREE.AmbientLight(color, intensity);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(7000, 10000, 13000);
    scene.add(dirLight);
    scene.add(light);
    scene.add(this.props.object);
    if (this.props.overrideMaterial) {
      scene.overrideMaterial = this.props.overrideMaterial;
    }
    if (this.props.axisLength) {
      scene.add(new THREE.AxesHelper(this.props.axisLength));
    }

    scene.background = null;
    this.scene = scene;

    const controls = new OrbitControls(camera, this.renderer.domElement);
    if (this.props.controlTarget) {
      controls.target.copy(this.props.controlTarget);
    }
    controls.autoRotate = !!this.props.autoRotate;
    controls.enableRotate = this.props.allowRotate ?? true;
    controls.enableZoom = !!this.props.allowZoom;
    controls.enablePan = !!this.props.allowPan;
    controls.enableDamping = !!this.props.enableMomentum;
    this.controls = controls;

    this.handleWindowResize();
    this.startRenderLoop();
  }

  componentDidUpdate(prevProps: Readonly<ThreeBasicObjectPreviewProps>) {
    if (prevProps.object !== this.props.object) {
      this.scene.remove(prevProps.object);
      this.scene.add(this.props.object);
    }
  }

  componentWillUnmount() {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    if (this.threeMountRef && this.threeMountRef.current && this.renderer) {
      this.threeMountRef.current.removeChild(this.renderer.domElement);
    }

    this.renderer?.forceContextLoss();
    this.controls.dispose();
    this.renderer?.dispose();
  }

  startRenderLoop() {
    const { renderer } = this;
    if (!renderer) {
      throw new Error(`Started render loop without required objects`);
    }

    const clock = new THREE.Clock();
    const animate = () => {
      const { scene, camera, controls } = this;
      this.handleWindowResize();
      this.animationFrameId = requestAnimationFrame(animate);
      if (this.props.animationMixer) {
        this.props.animationMixer.update(clock.getDelta());
      }
      this.props.onAnimate?.();
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
  }

  handleWindowResize() {
    if (!this.threeMountRef || !this.threeMountRef.current || !this.renderer) {
      return;
    }
    const canvas = this.renderer.domElement;
    const width = this.threeMountRef.current.clientWidth | 0;
    const height = this.threeMountRef.current.clientHeight | 0;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      this.setRenderSize(width, height);
    }
  }

  setRenderSize(width: number, height: number, updateStyle?: boolean) {
    const { camera } = this;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    this.renderer!.setSize(width, height, !!updateStyle);
  }

  render() {
    return (
      <div className="three-object-preview-wrapper" ref={this.threeMountRef} />
    );
  }
}
