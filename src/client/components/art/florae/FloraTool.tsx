import type {
  Flora,
  FloraAnimation,
  FloraCriteria,
  FloraSample,
} from "@/cayley/graphics/florae";
import { floraMeshFromModel } from "@/cayley/graphics/florae";
import { loadModelFromGltf } from "@/cayley/graphics/models";
import {
  axisAngleQuaternion,
  combineQuaternion,
  identityQuaterion,
} from "@/cayley/graphics/transform";
import { assert } from "@/cayley/numerics/util";
import {
  blockGardenMesh,
  blockMeshToThree,
} from "@/client/components/art/blocks/scenes";
import { bellFlowerFlora } from "@/client/components/art/common/db";
import {
  readGltfFile,
  readJsonFile,
  saveJsonFile,
} from "@/client/components/art/common/repo";
import { makeThreeMeshScenes } from "@/client/components/art/common/three";
import { loadFlora, saveFlora } from "@/client/components/art/florae/data";
import {
  floraMeshToThree,
  floraPlanarNoiseMesh,
} from "@/client/components/art/florae/scenes";
import { ThreeScene } from "@/client/components/art/ThreeScene";
import styles from "@/client/styles/admin.art.module.css";
import { Button, Input, InputNumber, Select } from "antd";
import { ok } from "assert";
import { useEffect, useRef, useState } from "react";

const ScaleSelector: React.FunctionComponent<{
  sample: FloraSample;
  signal: () => void;
}> = ({ sample, signal }) => {
  return (
    <div className={styles["grid-col"]}>
      <span className={styles["title"]}>Scale</span>
      <div>
        <InputNumber<number>
          style={{ width: "8em" }}
          value={sample.transform.scale}
          min={0}
          max={2}
          step={0.1}
          onChange={(scale) => {
            if (!isNaN(scale)) {
              sample.transform.scale = Number(scale);
              signal();
            }
          }}
        />
      </div>
    </div>
  );
};

const ShiftSelector: React.FunctionComponent<{
  sample: FloraSample;
  signal: () => void;
}> = ({ sample, signal }) => {
  const [x, y, z] = sample.transform.translate;
  return (
    <div className={styles["grid-col"]}>
      <span className={styles["title"]}>Shift</span>
      <div style={{ width: "16em" }}>
        <InputNumber<number>
          style={{ width: "5.3em" }}
          value={x}
          min={-10}
          max={10}
          step={0.1}
          onChange={(t) => {
            if (!isNaN(t)) {
              sample.transform.translate[0] = Number(t);
              signal();
            }
          }}
        />
        <InputNumber<number>
          style={{ width: "5.3em" }}
          value={y}
          min={-10}
          max={10}
          step={0.1}
          onChange={(t) => {
            if (!isNaN(t)) {
              sample.transform.translate[1] = Number(t);
              signal();
            }
          }}
        />
        <InputNumber<number>
          style={{ width: "5.3em" }}
          value={z}
          min={-10}
          max={10}
          step={0.1}
          onChange={(t) => {
            if (!isNaN(t)) {
              sample.transform.translate[2] = Number(t);
              signal();
            }
          }}
        />
      </div>
    </div>
  );
};

const RotateSelector: React.FunctionComponent<{
  sample: FloraSample;
  signal: () => void;
}> = ({ sample, signal }) => {
  return (
    <div className={styles["grid-col"]}>
      <span className={styles["title"]}>Rotate</span>
      <div style={{ width: "16em" }}>
        <Button
          style={{ width: "8em" }}
          onClick={() => {
            sample.transform.rotate = combineQuaternion(
              sample.transform.rotate,
              axisAngleQuaternion([0, 1, 0], 0.1)
            );
            signal();
          }}
        >
          Left
        </Button>
        <Button
          style={{ width: "8em" }}
          onClick={() => {
            sample.transform.rotate = combineQuaternion(
              sample.transform.rotate,
              axisAngleQuaternion([0, 1, 0], -0.1)
            );
            signal();
          }}
        >
          Right
        </Button>
      </div>
    </div>
  );
};

const GrowthSelector: React.FunctionComponent<{
  criteria: FloraCriteria;
  signal: () => void;
}> = ({ criteria, signal }) => {
  return (
    <div className={styles["grid-row"]}>
      <div className={styles["label"]}>Growth Stage</div>
      <Select
        style={{ width: "10em" }}
        value={criteria.growth}
        onChange={(value) => {
          criteria.growth = value;
          signal();
        }}
        options={["none", "seed", "sprout", "flowering", "adult", "wilted"].map(
          (name) => ({ value: name, label: name })
        )}
      />
    </div>
  );
};

const MuckSelector: React.FunctionComponent<{
  criteria: FloraCriteria;
  signal: () => void;
}> = ({ criteria, signal }) => {
  return (
    <div className={styles["grid-row"]}>
      <div className={styles["label"]}>Muck Level</div>
      <Select
        style={{ width: "10em" }}
        value={criteria.muck}
        onChange={(value) => {
          criteria.muck = value;
          signal();
        }}
        options={["none", "muck", "any"].map((name) => ({
          value: name,
          label: name,
        }))}
      />
    </div>
  );
};

const AnimationSelector: React.FunctionComponent<{
  animation: FloraAnimation;
  signal: () => void;
}> = ({ animation, signal }) => {
  return (
    <div className={`${styles["stack-col"]} ${styles["card"]}`}>
      <div className={styles["grid-row"]}>
        <div className={styles["label"]}>Procedural Rotation</div>
        <Select
          style={{ width: "10em" }}
          value={animation.rotation}
          onChange={(value) => {
            animation.rotation = value;
            signal();
          }}
          options={["none", "yaw", "any"].map((name) => ({
            value: name,
            label: name,
          }))}
        />
      </div>
      <div className={styles["grid-row"]}>
        <div className={styles["label"]}>Wind Type</div>
        <Select
          style={{ width: "10em" }}
          value={animation.wind}
          onChange={(value) => {
            animation.wind = value;
            signal();
          }}
          options={["none", "plant", "leaf"].map((name) => ({
            value: name,
            label: name,
          }))}
        />
      </div>
    </div>
  );
};

async function loadGltf() {
  const config = await readGltfFile();
  const model = loadModelFromGltf(config);
  return floraMeshFromModel(model);
}

const MeshSelector: React.FunctionComponent<{
  sample: FloraSample;
  signal: () => void;
}> = ({ sample, signal }) => {
  return (
    <Button
      style={{ width: "16em" }}
      onClick={() =>
        void loadGltf().then((mesh) => {
          sample.material = mesh.material;
          sample.geometry = mesh.geometry;
          signal();
        })
      }
    >
      Open Mesh
    </Button>
  );
};

const SampleEditor: React.FunctionComponent<{
  sample: FloraSample;
  signal: () => void;
}> = ({ sample, signal }) => {
  return (
    <div className={styles["grid-col"]}>
      <MeshSelector sample={sample} signal={signal} />
      <ShiftSelector sample={sample} signal={signal} />
      <ScaleSelector sample={sample} signal={signal} />
      <RotateSelector sample={sample} signal={signal} />
      <GrowthSelector criteria={sample.criteria} signal={signal} />
      <MuckSelector criteria={sample.criteria} signal={signal} />
    </div>
  );
};

const SamplesEditor: React.FunctionComponent<{
  samples: FloraSample[];
  signal: () => void;
}> = ({ samples, signal }) => {
  ok(samples.length > 0);
  const index = useRef(0);
  if (index.current >= samples.length) {
    index.current = samples.length - 1;
  }

  return (
    <>
      <span className={styles["title"]}>Flora Samples</span>
      <div className={`${styles["stack-col"]} ${styles["card"]}`}>
        <Select
          style={{ width: "16em" }}
          placeholder="Select sample..."
          optionFilterProp="children"
          onSelect={(i: number) => {
            index.current = i;
            signal();
          }}
          value={index.current}
        >
          {samples.map((_, i) => (
            <Select.Option value={i} key={i}>{`sample_${i + 1}`}</Select.Option>
          ))}
        </Select>
      </div>
      <SampleEditor sample={samples[index.current]} signal={signal} />
      <div className={styles["grid-col"]}>
        <Button
          style={{ width: "16em" }}
          onClick={() => {
            samples.push({
              ...samples[samples.length - 1],
              criteria: {
                growth: "none",
                muck: "none",
              },
              transform: {
                scale: 1.0,
                rotate: identityQuaterion(),
                translate: [0, 0, 0],
              },
            });
            index.current = samples.length - 1;
            signal();
          }}
        >
          Add Sample
        </Button>
        <Button
          danger
          disabled={samples.length <= 1}
          type="primary"
          style={{ width: "16em" }}
          onClick={() => {
            samples.splice(index.current, 1);
            signal();
          }}
        >
          Delete Sample
        </Button>
      </div>
    </>
  );
};

async function loadFloraConfig(onLoad: (data: Flora) => void) {
  const config = await readJsonFile("Flora Config");
  onLoad(loadFlora(config));
}

async function saveFloraConfig(flora: Flora) {
  return saveJsonFile(saveFlora(flora), "Flora Config");
}

const FloraEditor: React.FunctionComponent<{
  flora: Flora;
  setFlora: (flora: Flora) => void;
}> = ({ flora, setFlora }) => {
  assert(flora.samples.length > 0);
  const signal = () => setFlora({ ...flora });

  return (
    <div className={`${styles["stack-col"]} ${styles["editor"]}`}>
      <div className={`${styles["stack-row"]} ${styles["card"]}`}>
        <Button
          style={{ width: "10em" }}
          onClick={() => void loadFloraConfig(setFlora)}
        >
          Open Flora
        </Button>
        <Button
          style={{ width: "10em" }}
          onClick={() => void saveFloraConfig(flora)}
        >
          Save Flora
        </Button>
      </div>
      <div className={`${styles["stack-col"]} ${styles["card"]}`}>
        <Input
          style={{ width: "20em" }}
          addonBefore="Name"
          value={flora.name}
          onChange={(e) => {
            flora.name = e.target.value ?? "Unspecified";
            signal();
          }}
        />
      </div>
      <AnimationSelector animation={flora.animation} signal={signal} />
      <div
        className={`${styles["stack-col"]} ${styles["card"]} ${styles["divider"]}`}
      >
        <SamplesEditor samples={flora.samples} signal={signal} />
      </div>
    </div>
  );
};

const FloraViewer: React.FunctionComponent<{ flora: Flora }> = ({ flora }) => {
  const floraMesh = floraMeshToThree(floraPlanarNoiseMesh(flora));
  const blockMesh = blockMeshToThree(blockGardenMesh());

  // Position the meshes.
  blockMesh.position.set(-6, -6, -6);
  floraMesh.position.set(-6, -6, -6);

  // Free geometry buffers and textures on re-render.
  useEffect(() => {
    return () => {
      blockMesh.geometry.dispose();
      blockMesh.material.uniforms.colorMap.value.dispose();
      floraMesh.geometry.dispose();
      floraMesh.material.uniforms.colorMap.value.dispose();
    };
  }, [blockMesh]);

  return (
    <div className={styles["grid-col"]}>
      <div style={{ width: "65vw", height: "80vh" }}>
        <ThreeScene
          scenes={makeThreeMeshScenes(floraMesh, blockMesh)}
          cameraPos={[0, 5, 10]}
          axesPos={[-8, -4, -8]}
        />
      </div>
    </div>
  );
};

export const FloraTool: React.FunctionComponent<{}> = ({}) => {
  const [flora, setFlora] = useState<Flora>(loadFlora(bellFlowerFlora()));

  return (
    <div className={styles["stack-row"]}>
      <div className={`${styles["item-fixed"]} ${styles["card"]}`}>
        <FloraEditor flora={flora} setFlora={setFlora} />
      </div>
      <div className={`${styles["item-grows"]} ${styles["card"]}`}>
        <FloraViewer flora={flora} />
      </div>
    </div>
  );
};
