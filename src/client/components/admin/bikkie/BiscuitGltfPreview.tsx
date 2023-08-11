import { ThreeBasicObjectPreview } from "@/client/components/ThreeBasicObjectPreview";
import { DialogButton } from "@/client/components/system/DialogButton";
import type { Disposable } from "@/shared/disposable";
import { useRef, useState } from "react";
import * as THREE from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

interface BiscuitGltfPreviewProps {
  gltf: Disposable<GLTF>;
}

export function BiscuitGltfPreview({ gltf }: BiscuitGltfPreviewProps) {
  const [animation, setAnimation] = useState<undefined | THREE.AnimationClip>();
  const viewerRef = useRef<ThreeBasicObjectPreview | null>(null);
  const animations = gltf.animations;
  const object = gltf.scene;
  const mixer = new THREE.AnimationMixer(object);
  const sceneBounds = new THREE.Box3().setFromObject(object);
  const center = sceneBounds.getCenter(new THREE.Vector3());
  const size = sceneBounds.getSize(new THREE.Vector3());

  function cameraPosition() {
    const maxDim = Math.max(size.x, size.y, size.z);
    // 45 = camera's FOV.
    const distance = maxDim / Math.tan((Math.PI * 45) / 360);
    const position = center.clone();
    position.z -= distance * 1.5;
    return position;
  }

  function targetPosition() {
    return center;
  }

  function updatePlayingAnimation(clip: THREE.AnimationClip | undefined) {
    // Toggle the animation off if it's currently active.
    clip = clip?.name === animation?.name ? undefined : clip;
    setAnimation(clip);
    mixer.stopAllAction();
  }

  if (animation !== undefined) {
    mixer.clipAction(animation).play();
  }

  return (
    <div className={"w-full"}>
      <ThreeBasicObjectPreview
        ref={viewerRef}
        allowPan={true}
        allowZoom={true}
        allowRotate={true}
        animationMixer={mixer}
        axisLength={Math.max(size.x, size.y, size.z)}
        object={object}
        controlTarget={targetPosition()}
        cameraPos={cameraPosition()}
        overrideMaterial={
          new THREE.MeshBasicMaterial({
            vertexColors: true,
          })
        }
      />
      {animations.length > 0 && (
        <>
          <label>Animations</label>
          <div className="pad flex w-full flex-row gap-1">
            {animations.map((clip) => {
              return (
                <DialogButton
                  key={clip.name}
                  extraClassNames={`box-border ${
                    animation?.name === clip.name && "border border-red"
                  }`}
                  onClick={() => {
                    updatePlayingAnimation(clip);
                  }}
                >
                  {clip.name}
                </DialogButton>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
