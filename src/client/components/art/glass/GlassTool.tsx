import {
  CheckerboardSelector,
  DyeSelector,
  loadBlockConfig,
  MaterialSelector,
  MoistureSelector,
  MuckSelector,
  saveBlockConfig,
} from "@/client/components/art/blocks/BlockTool";
import type { Block, BlockSample } from "@/client/components/art/blocks/data";
import {
  blockSlabMesh,
  blockUnitMesh,
  glassMeshToThree,
} from "@/client/components/art/blocks/scenes";
import { simpleGlass } from "@/client/components/art/common/db";

import { makeThreeMeshScenes } from "@/client/components/art/common/three";

import { ThreeScene } from "@/client/components/art/ThreeScene";
import styles from "@/client/styles/admin.art.module.css";
import { Button, Input, Select } from "antd";
import { ok } from "assert";
import { useEffect, useRef, useState } from "react";

// TODO: This is just a temporary way to fix translucent rendering in this tool.
// At the moment there is no way to mesh tranluscent blocks and opaque blocks independently.
// Possibly remove this tool when we start using the same meshing routines as the game.

const SampleViewer: React.FunctionComponent<{ sample: BlockSample }> = ({
  sample,
}) => {
  const mesh = glassMeshToThree(
    blockUnitMesh({
      samples: [
        {
          ...sample,
          criteria: {
            position: "black",
          },
        },
      ],
    })
  );
  mesh.geometry.center();

  // Free geometry buffers and textures on re-render.
  useEffect(() => {
    return () => {
      mesh.geometry.dispose();
      mesh.material.uniforms.colorMap.value.dispose();
    };
  });

  return (
    <div className={styles["grid-col"]}>
      <div style={{ width: "256px", height: "256px" }}>
        <ThreeScene
          scenes={makeThreeMeshScenes(mesh)}
          cameraPos={[0, 1.5, 1.5]}
        />
      </div>
    </div>
  );
};

const SampleEditor: React.FunctionComponent<{
  sample: BlockSample;
  signal: () => void;
}> = ({ sample, signal }) => {
  return (
    <div className={styles["grid-col"]}>
      <SampleViewer sample={sample} />
      <CheckerboardSelector criteria={sample.criteria} signal={signal} />
      <MuckSelector criteria={sample.criteria} signal={signal} />
      <MoistureSelector criteria={sample.criteria} signal={signal} />
      <DyeSelector criteria={sample.criteria} signal={signal} />
      <MaterialSelector material={sample.material} signal={signal} />
    </div>
  );
};

const SamplesEditor: React.FunctionComponent<{
  samples: BlockSample[];
  signal: () => void;
}> = ({ samples, signal }) => {
  ok(samples.length > 0);
  const index = useRef(0);
  if (index.current >= samples.length) {
    index.current = samples.length - 1;
  }

  return (
    <>
      <span className={styles["title"]}>Block Samples</span>
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
            samples.push(simpleGlass().samples[0]);
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

const GlassEditor: React.FunctionComponent<{
  block: Block;
  setBlock: (block: Block) => void;
}> = ({ block, setBlock }) => {
  const signal = () => setBlock({ ...block });

  return (
    <div className={`${styles["stack-col"]} ${styles["editor"]}`}>
      <div className={`${styles["stack-row"]} ${styles["card"]}`}>
        <Button
          style={{ width: "10em" }}
          onClick={() => void loadBlockConfig(setBlock)}
        >
          Open Block
        </Button>
        <Button
          style={{ width: "10em" }}
          onClick={() => void saveBlockConfig(block)}
        >
          Save Block
        </Button>
      </div>
      <div className={`${styles["stack-col"]} ${styles["card"]}`}>
        <Input
          style={{ width: "20em" }}
          addonBefore="Name"
          value={block.name}
          onChange={(e) => {
            block.name = e.target.value ?? "Unspecified";
            signal();
          }}
        />
      </div>
      <div
        className={`${styles["stack-col"]} ${styles["card"]} ${styles["divider"]}`}
      >
        <SamplesEditor samples={block.samples} signal={signal} />
      </div>
    </div>
  );
};

const GlassViewer: React.FunctionComponent<{ block: Block }> = ({ block }) => {
  const mesh = glassMeshToThree(blockSlabMesh(block));
  mesh.geometry.center();

  // Free geometry buffers and textures on re-render.
  useEffect(() => {
    return () => {
      mesh.geometry.dispose();
      mesh.material.uniforms.colorMap.value.dispose();
    };
  });

  return (
    <div className={styles["grid-col"]}>
      <div style={{ width: "65vw", height: "80vh" }}>
        <ThreeScene
          scenes={makeThreeMeshScenes(mesh)}
          cameraPos={[0, 5, 10]}
          axesPos={[-8, -4, -8]}
        />
      </div>
    </div>
  );
};

export const GlassTool: React.FunctionComponent<{}> = ({}) => {
  const [block, setBlock] = useState<Block>({
    ...simpleGlass(),
    name: "New Block",
  });

  return (
    <div className={styles["stack-row"]}>
      <div className={`${styles["item-fixed"]} ${styles["card"]}`}>
        <GlassEditor block={block} setBlock={setBlock} />
      </div>
      <div className={`${styles["item-grows"]} ${styles["card"]}`}>
        <GlassViewer block={block} />
      </div>
    </div>
  );
};
