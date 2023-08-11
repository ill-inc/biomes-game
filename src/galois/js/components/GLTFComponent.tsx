import type { SceneFactory } from "@/galois/components/Scene";
import { Scene } from "@/galois/components/Scene";
import { Select } from "antd";
import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader";

const { Option } = Select;

interface GLTFInfo {
  getSceneFactory: (currentAnimation: number) => SceneFactory;
  gltf: GLTF;
}

interface AttachMesh {
  attachToJoint: string;
  attachmentTransform?: number[]; // 4x4 matrix, column-major
  gltfData: string | ArrayBuffer;
}

function parseGltf(data: string | ArrayBuffer) {
  const loader = new GLTFLoader();
  return loader.parseAsync(data, "/");
}

export const GLTFComponent: React.FunctionComponent<{
  data: string | ArrayBuffer;
  attachMesh?: AttachMesh;
  animationGltf?: string | ArrayBuffer;
}> = ({ data, attachMesh, animationGltf }) => {
  const [gltfInfo, setGltfInfo] = useState<GLTFInfo | null>(null);
  const [error, setError] = useState<ErrorEvent | null>(null);
  const [currentAnimation, setCurrentAnimation] = useState<number>(-1);

  // Asynchronously load the specified glTF data. `error` or `gltfInfo` will
  // be set upon completion.
  useEffect(() => {
    setGltfInfo(null);
    setError(null);
    setCurrentAnimation(-1);

    void (async () => {
      try {
        const [main, attach, animations] = await Promise.all([
          parseGltf(data),
          attachMesh
            ? parseGltf(attachMesh.gltfData)
            : Promise.resolve(undefined),
          animationGltf ? parseGltf(animationGltf) : Promise.resolve(undefined),
        ]);
        setGltfInfo(
          onGLTFLoaded(
            main,
            attach
              ? {
                  attachToJoint: attachMesh!.attachToJoint,
                  gltf: attach,
                  transform: attachMesh!.attachmentTransform,
                }
              : undefined,
            animations
          )
        );
      } catch (e: any) {
        setError(e);
      }
    })();
  }, [data, attachMesh, animationGltf]);

  // Render out the glTF HTML.
  if (error) {
    return (
      <div>
        <>Error: {error}</>
      </div>
    );
  } else if (gltfInfo) {
    return getGltfSceneHtml(gltfInfo, currentAnimation, (value: string) => {
      setCurrentAnimation(parseInt(value));
    });
  } else {
    return <div>Loading...</div>;
  }
};

function getGltfSceneHtml(
  gltfInfo: GLTFInfo,
  currentAnimation: number,
  handleAnimationChange: (value: string) => void
) {
  const animationDropdown = getAnimationDropdown(
    gltfInfo,
    handleAnimationChange
  );

  return (
    <Scene factory={gltfInfo.getSceneFactory(currentAnimation)}>
      {animationDropdown}
    </Scene>
  );
}

function getAnimationDropdown(
  gltfInfo: GLTFInfo,
  handleChange: (value: string) => void
) {
  const animationsWithNames = Array.from(
    gltfInfo.gltf.animations.entries()
  ).flatMap((x) => (x[1].name ? [{ index: x[0], anim: x[1] }] : []));
  if (animationsWithNames.length <= 0) {
    return <></>;
  } else {
    return (
      <div className="animations-list">
        <span>
          <span className="label">Animation:</span>
          <Select onChange={handleChange}>
            {animationsWithNames.map((x) => (
              <Option value={x.index} key={x.index}>
                {x.anim.name}
              </Option>
            ))}
          </Select>
        </span>
      </div>
    );
  }
}

function onGLTFLoaded(
  gltf: GLTF,
  attachInfo?: { attachToJoint: string; gltf: GLTF; transform?: number[] },
  animations?: GLTF
): GLTFInfo {
  if (animations) {
    mergeAnimations(gltf, animations);
  }

  const gltfScene = gltf.scene || gltf.scenes[0];
  let meshCount = 0;
  // Replace mesh materials with a MeshPhongMaterial shader, similar to how it will appear
  // in-game.
  gltfScene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      ++meshCount;
    } else {
      if (attachInfo?.attachToJoint == child.name) {
        const attachment = new THREE.Group();
        child.add(attachment);
        if (attachInfo.transform) {
          console.log(attachInfo.transform);
          attachment.applyMatrix4(
            new THREE.Matrix4().fromArray(attachInfo.transform)
          );
        }
        const attachScene = attachInfo.gltf.scene || attachInfo.gltf.scenes[0];
        attachScene.children.forEach((x) => {
          attachment.add(x.clone());
        });
      }
    }
  });

  if (meshCount == 0) {
    throw new Error("No meshes found in GLTF file, nothing to display.");
  }

  const mixer = new THREE.AnimationMixer(gltfScene);

  const getFactory = (currentAnimation: number) => {
    return (t: number, _: THREE.Camera) => {
      const scene = new THREE.Scene();
      const ambientIntensity = 0.6;
      const ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity);
      scene.add(ambientLight);
      // Add multiple directional lights so that all different face
      // orientations can be distinguished.
      const dirIntensity = 0.6;
      const dirLight1 = new THREE.DirectionalLight(0xffffff, dirIntensity);
      dirLight1.position.set(4391, 6037, 9679);
      scene.add(dirLight1);
      const dirLight2 = new THREE.DirectionalLight(0xffffff, dirIntensity);
      dirLight2.position.set(-7789, -5749, -8629);
      scene.add(dirLight2);

      // Play animations if any are selected.
      if (currentAnimation >= 0) {
        // We only support playing one animation at a time right now.
        mixer.stopAllAction();
        const action = mixer.clipAction(gltf.animations[currentAnimation]);
        action.play();
        mixer.setTime(t);
      }

      scene.add(gltfScene);

      return scene;
    };
  };

  return {
    getSceneFactory: getFactory,
    gltf: gltf,
  };
}

function mergeAnimations(gltf: GLTF, animations: GLTF) {
  animations.animations.forEach((x) => {
    const clonedAnimation = x.clone();
    gltf.animations.push(clonedAnimation);
  });
}
