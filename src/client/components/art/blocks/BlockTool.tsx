import type {
  Block,
  BlockCriteria,
  BlockMaterial,
  BlockSample,
} from "@/client/components/art/blocks/data";
import { zBlock } from "@/client/components/art/blocks/data";
import {
  blockMeshToThree,
  blockSlabMesh,
  blockUnitMesh,
} from "@/client/components/art/blocks/scenes";
import { cottonBlock } from "@/client/components/art/common/db";
import {
  readJsonFile,
  readPngFile,
  saveJsonFile,
} from "@/client/components/art/common/repo";
import { makeThreeMeshScenes } from "@/client/components/art/common/three";
import {
  flipImage,
  toImgStr,
  toImgUrl,
} from "@/client/components/art/common/utils";
import { ThreeScene } from "@/client/components/art/ThreeScene";
import styles from "@/client/styles/admin.art.module.css";
import { getDyeNames } from "@/shared/asset_defs/blocks";
import { Button, Input, Radio, Select } from "antd";
import { ok } from "assert";
import { useEffect, useRef, useState } from "react";

// TODO: Rewrite the code below to operate over the graphics API types and convert
// immediate from the repo format when loading block configs.

export const SampleViewer: React.FunctionComponent<{ sample: BlockSample }> = ({
  sample,
}) => {
  const mesh = blockMeshToThree(
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

export const DyeSelector: React.FunctionComponent<{
  criteria: BlockCriteria;
  signal: () => void;
}> = ({ criteria, signal }) => {
  return (
    <div className={styles["grid-row"]}>
      <div className={styles["label"]}>Dye Color</div>
      <Select
        style={{ width: "10em" }}
        value={criteria.dye}
        onChange={(value) => {
          criteria.dye = value;
          signal();
        }}
        options={["none", ...getDyeNames()].map((name) => ({
          value: name,
          label: name,
        }))}
      />
    </div>
  );
};

export const MoistureSelector: React.FunctionComponent<{
  criteria: BlockCriteria;
  signal: () => void;
}> = ({ criteria, signal }) => {
  return (
    <div className={styles["grid-row"]}>
      <div className={styles["label"]}>Moisture</div>
      <Select
        style={{ width: "10em" }}
        value={criteria.moisture}
        onChange={(value) => {
          criteria.moisture = value as any;
          signal();
        }}
        options={[
          { value: "any", label: "Any" },
          { value: "zero", label: "Zero" },
          { value: "low", label: "Low" },
          { value: "moderate", label: "Moderate" },
          { value: "high", label: "High" },
          { value: "full", label: "Full" },
        ]}
      />
    </div>
  );
};

export const MuckSelector: React.FunctionComponent<{
  criteria: BlockCriteria;
  signal: () => void;
}> = ({ criteria, signal }) => {
  return (
    <div className={styles["grid-row"]}>
      <div className={styles["label"]}>Muck Level</div>
      <Select
        style={{ width: "10em" }}
        value={criteria.muck}
        onChange={(value) => {
          criteria.muck = value as any;
          signal();
        }}
        options={[
          { value: "any", label: "Any" },
          { value: "none", label: "None" },
          { value: "muck", label: "Muck" },
        ]}
      />
    </div>
  );
};

export const CheckerboardSelector: React.FunctionComponent<{
  criteria: BlockCriteria;
  signal: () => void;
}> = ({ criteria, signal }) => {
  return (
    <div className={styles["grid-row"]}>
      <div className={styles["label"]}>Checkerboard</div>
      <div style={{ width: "10em" }}>
        <Radio.Group
          value={criteria.position}
          buttonStyle="solid"
          onChange={({ target: { value } }) => {
            criteria.position = value;
            signal();
          }}
        >
          <Radio.Button style={{ width: "5em" }} value="black">
            Black
          </Radio.Button>
          <Radio.Button style={{ width: "5em" }} value="white">
            White
          </Radio.Button>
        </Radio.Group>
      </div>
    </div>
  );
};

export const TexturePicker: React.FunctionComponent<{
  pixels: string;
  onPick: (pixels: string) => void;
}> = ({ pixels, onPick }) => {
  return (
    <img
      className={styles["texture"]}
      style={{ width: "128px", height: "128px" }}
      src={toImgUrl(pixels)}
      onClick={() => {
        void readPngFile().then((bytes) => {
          onPick(toImgStr(flipImage(bytes)));
        });
      }}
    ></img>
  );
};

export const MaterialSelector: React.FunctionComponent<{
  material: BlockMaterial;
  signal: () => void;
}> = ({ material, signal }) => {
  return (
    <>
      <div className={styles["grid-col"]}>
        <span className={styles["title"]}>Colors</span>
        <TexturePicker
          pixels={material.color.x_neg}
          onPick={(blob) => {
            material.color.x_neg = blob;
            material.color.x_pos = blob;
            material.color.z_neg = blob;
            material.color.z_pos = blob;
            signal();
          }}
        ></TexturePicker>
        <TexturePicker
          pixels={material.color.y_neg}
          onPick={(blob) => {
            material.color.y_neg = blob;
            signal();
          }}
        ></TexturePicker>
        <TexturePicker
          pixels={material.color.y_pos}
          onPick={(blob) => {
            material.color.y_pos = blob;
            signal();
          }}
        ></TexturePicker>
      </div>
      <div className={styles["grid-col"]}>
        <span className={styles["title"]}>MREA</span>
        <TexturePicker
          pixels={material.mrea.x_neg}
          onPick={(blob) => {
            material.mrea.x_neg = blob;
            material.mrea.x_pos = blob;
            material.mrea.z_neg = blob;
            material.mrea.z_pos = blob;
            signal();
          }}
        ></TexturePicker>
        <TexturePicker
          pixels={material.mrea.y_neg}
          onPick={(blob) => {
            material.mrea.y_neg = blob;
            signal();
          }}
        ></TexturePicker>
        <TexturePicker
          pixels={material.mrea.y_pos}
          onPick={(blob) => {
            material.mrea.y_pos = blob;
            signal();
          }}
        ></TexturePicker>
      </div>
    </>
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
            samples.push(cottonBlock().samples[0]);
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

export async function loadBlockConfig(onLoad: (data: Block) => void) {
  const config = await readJsonFile("Block Config");
  onLoad(zBlock.parse(config));
}

export async function saveBlockConfig(block: Block) {
  return saveJsonFile(block, "Block Config");
}

const BlockEditor: React.FunctionComponent<{
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

const BlockViewer: React.FunctionComponent<{ block: Block }> = ({ block }) => {
  const mesh = blockMeshToThree(blockSlabMesh(block));
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

export const BlockTool: React.FunctionComponent<{}> = ({}) => {
  const [block, setBlock] = useState<Block>({
    ...cottonBlock(),
    name: "New Block",
  });

  return (
    <div className={styles["stack-row"]}>
      <div className={`${styles["item-fixed"]} ${styles["card"]}`}>
        <BlockEditor block={block} setBlock={setBlock} />
      </div>
      <div className={`${styles["item-grows"]} ${styles["card"]}`}>
        <BlockViewer block={block} />
      </div>
    </div>
  );
};
