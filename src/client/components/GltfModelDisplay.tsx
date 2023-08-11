import { ThreeBasicObjectPreview } from "@/client/components/ThreeBasicObjectPreview";
import type { Disposable } from "@/shared/disposable";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

interface GltfModelDisplayProps {
  gltf: Disposable<GLTF>;
  idleAnimationClip: THREE.AnimationClip;
  onClickAnimationClip?: THREE.AnimationClip;
  scale?: number;
  verticalOffset?: number | undefined;
}

export function GltfModelDisplay({
  gltf,
  idleAnimationClip,
  onClickAnimationClip,
  scale,
  verticalOffset,
}: GltfModelDisplayProps) {
  const viewerRef = useRef<ThreeBasicObjectPreview | null>(null);
  const object = gltf.scene;
  const mixer = new THREE.AnimationMixer(object);
  const idleAnimation = mixer.clipAction(idleAnimationClip);
  const onClickAnimation =
    onClickAnimationClip !== undefined
      ? mixer.clipAction(onClickAnimationClip)
      : undefined;
  const sceneBounds = new THREE.Box3().setFromObject(object);
  const center = sceneBounds.getCenter(new THREE.Vector3());
  const size = sceneBounds.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  useEffect(() => {
    object.scale.setScalar(scale ?? 1.0);
    object.position.y -= verticalOffset ?? 0.0;
  }, [object]);

  useEffect(() => {
    mixer.stopAllAction();
    playIdleAnimation();
  }, []);

  function cameraPosition() {
    // 45 = camera's FOV.
    const distance = maxDim / Math.tan((Math.PI * 45) / 360);
    const position = center.clone();
    // These values were determines based on feel.
    const relative = 0.7;
    position.z -= distance * relative;
    position.y += distance * relative * 0.5;
    return position;
  }

  function onClick() {
    if (!onClickAnimation) return;
    if (!onClickAnimation.isRunning()) {
      onClickAnimation.reset();
      onClickAnimation.setLoop(THREE.LoopOnce, 1).play();
      playIdleAnimation();
    }
  }

  function playIdleAnimation() {
    if (onClickAnimation) {
      // Makes the transitions between animations buttery smooth.
      onClickAnimation
        .crossFadeTo(idleAnimation, onClickAnimationClip!.duration, false)
        .play();
    } else {
      idleAnimation.play();
    }
  }

  return (
    <div className="h-full" onClick={() => onClick()}>
      <ThreeBasicObjectPreview
        ref={viewerRef}
        allowPan={false}
        allowZoom={false}
        enableMomentum={true}
        animationMixer={mixer}
        cameraPos={cameraPosition()}
        controlTarget={new THREE.Vector3(0, 0, 0)}
        allowRotate={true}
        autoRotate={true}
        object={object}
      />
    </div>
  );
}
