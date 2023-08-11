import { BiscuitDropDown } from "@/client/components/admin/bikkie/attributes/BiscuitDropDown";
import { DropTableEditor } from "@/client/components/admin/bikkie/attributes/DropTableEditor";
import { DurationEditor } from "@/client/components/admin/bikkie/attributes/DurationEditor";
import { CrossbreedingEditor } from "@/client/components/admin/bikkie/attributes/farming/CrossbreedingEditor";
import {
  EditFarmingIrradiance,
  EditFarmingRequiresSun,
  EditFarmingStage,
} from "@/client/components/admin/bikkie/attributes/farming/EditFarmingStage";
import { useMatchingBiscuits } from "@/client/components/admin/bikkie/search";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import styles from "@/client/styles/admin.bikkie.module.css";
import type {
  BasicFarmSpec,
  FarmSpec,
  TreeFarmSpec,
  VariantFarmSpec,
} from "@/shared/game/farming";
import {
  defaultFarmSpec,
  defaultFarmStageSpec,
  zFarmSpec,
} from "@/shared/game/farming";
import type { Vec4 } from "@/shared/math/types";
import React from "react";

export const EditFarmingDrops: React.FunctionComponent<{
  def: Readonly<BasicFarmSpec | TreeFarmSpec>;
  onChange: (def: FarmSpec) => void;
}> = ({ def, onChange }) => {
  return (
    <>
      <Tooltipped
        tooltip={
          "Loot table to roll when the plant is destroyed before fully growing"
        }
      >
        <label>Partial Growth Drop Table</label>
      </Tooltipped>
      <DropTableEditor
        value={def.partialGrowthDropTable ?? []}
        schema={"/items"}
        onChange={(partialGrowthDropTable) =>
          onChange({ ...def, partialGrowthDropTable })
        }
      />
      <Tooltipped
        tooltip={"Loot table to roll when the plant is when fully grown"}
      >
        <label>Drop Table</label>
      </Tooltipped>
      <DropTableEditor
        value={def.dropTable ?? []}
        schema={"/items"}
        onChange={(dropTable) => onChange({ ...def, dropTable })}
      />
      <Tooltipped
        tooltip={
          "Loot table to roll for seeds when no crossbreed is fulfilled (or rolled). This is in addition to the normal drop table."
        }
      >
        <label>Harvest Drop Table</label>
      </Tooltipped>
      <DropTableEditor
        value={def.seedDropTable ?? []}
        schema={"/items/seed"}
        onChange={(seedDropTable) => onChange({ ...def, seedDropTable })}
      />
      <Tooltipped
        tooltip={
          "When these (other) plants are planted next to each other, have a chance in resulting in this (current biscuit) seed."
        }
      >
        <label>Crossbreeds</label>
      </Tooltipped>
      <CrossbreedingEditor
        crossbreeds={def.crossbreeds}
        onChange={(crossbreeds) => onChange({ ...def, crossbreeds })}
      />
    </>
  );
};

export const EditFarming: React.FunctionComponent<{
  def: Readonly<FarmSpec>;
  onChange: (def: FarmSpec) => void;
}> = ({ def, onChange }) => {
  const selector = (
    <select
      onChange={(e) => {
        onChange(defaultFarmSpec(e.target.value as FarmSpec["kind"]));
      }}
    >
      {[...zFarmSpec.optionsMap.keys()].map((kindPrimitive) => {
        const kind = kindPrimitive as FarmSpec["kind"];
        return (
          <option value={kind} selected={def.kind === kind} key={kind}>
            {kind}
          </option>
        );
      })}
    </select>
  );

  let editor: JSX.Element | undefined;
  switch (def.kind) {
    default:
    case "basic":
      editor = <EditFarmingBasic def={def} onChange={onChange} />;
      break;
    case "tree":
      editor = <EditFarmingTree def={def} onChange={onChange} />;
      break;
    case "variant":
      editor = <EditFarmingVariant def={def} onChange={onChange} />;
      break;
  }
  return (
    <>
      {selector}
      {editor}
    </>
  );
};

export const EditFarmingBasic: React.FunctionComponent<{
  def: Readonly<BasicFarmSpec>;
  onChange: (def: FarmSpec) => void;
}> = ({ def, onChange }) => {
  const blockBiscuits = useMatchingBiscuits("/blocks");
  return (
    <div className={styles["complex-attribute"]}>
      <Tooltipped tooltip={"Leave blank to use the name of the block"}>
        <label>Name</label>
        <input
          type="text"
          value={def.name}
          onChange={(e) => onChange({ ...def, name: e.target.value })}
        />
      </Tooltipped>
      <label>Block</label>
      <BiscuitDropDown
        biscuits={blockBiscuits}
        selected={def.block}
        onSelect={(block) => block && onChange({ ...def, block })}
      />
      <Tooltipped tooltip={"If this block has growth stages defined"}>
        <div className={styles["compound-attribute"]}>
          <label>Block has growth stages</label>
          <input
            type="checkbox"
            checked={def.hasGrowthStages ?? true}
            onChange={(e) => {
              onChange({ ...def, hasGrowthStages: e.target.checked });
            }}
          />
        </div>
      </Tooltipped>
      <label>Growth Time</label>
      <DurationEditor
        timeMs={def.timeMs}
        onChange={(timeMs) => onChange({ ...def, timeMs })}
      />
      <label>Water Interval</label>
      <DurationEditor
        timeMs={def.waterIntervalMs}
        onChange={(waterIntervalMs) => onChange({ ...def, waterIntervalMs })}
      />
      <label>Death Time</label>
      <DurationEditor
        timeMs={def.deathTimeMs}
        onChange={(deathTimeMs) => onChange({ ...def, deathTimeMs })}
      />
      <EditFarmingRequiresSun
        requiresSun={def.requiresSun}
        onChange={(requiresSun) => onChange({ ...def, requiresSun })}
      />
      <EditFarmingIrradiance
        irradiance={def.irradiance as Vec4 | undefined}
        onChange={(irradiance) => onChange({ ...def, irradiance })}
      />
      <EditFarmingDrops def={def} onChange={onChange} />
    </div>
  );
};

export const EditFarmingTree: React.FunctionComponent<{
  def: Readonly<TreeFarmSpec>;
  onChange: (def: FarmSpec) => void;
}> = ({ def, onChange }) => {
  const blockBiscuits = useMatchingBiscuits("/blocks");
  return (
    <div className={styles["complex-attribute"]}>
      <Tooltipped tooltip={"Leave blank to use the name of the log block"}>
        <label>Name</label>
        <input
          type="text"
          value={def.name}
          onChange={(e) => onChange({ ...def, name: e.target.value })}
        />
      </Tooltipped>
      <label>Leaf Block</label>
      <BiscuitDropDown
        biscuits={blockBiscuits}
        selected={def.leafBlock}
        onSelect={(leafBlock) => leafBlock && onChange({ ...def, leafBlock })}
      />
      <label>Log Block</label>
      <BiscuitDropDown
        biscuits={blockBiscuits}
        selected={def.logBlock}
        onSelect={(logBlock) => logBlock && onChange({ ...def, logBlock })}
      />
      <label>Water Interval</label>
      <DurationEditor
        timeMs={def.waterIntervalMs}
        onChange={(waterIntervalMs) => onChange({ ...def, waterIntervalMs })}
      />
      <label>Death Time</label>
      <DurationEditor
        timeMs={def.deathTimeMs}
        onChange={(deathTimeMs) => onChange({ ...def, deathTimeMs })}
      />
      <EditFarmingDrops def={def} onChange={onChange} />
      <label>Stages</label>
      <ol className={styles["complex-attribute"]}>
        {def.stages.map((stage, i) => (
          <li key={i}>
            <div className={styles["compound-attribute"]}>
              <label>Stage {i}</label>
              <button
                className={"button dialog-button"}
                onClick={() => {
                  const newStages = [...def.stages];
                  newStages.splice(i, 1);
                  onChange({ ...def, stages: newStages });
                }}
              >
                Remove
              </button>
            </div>
            <EditFarmingStage
              stage={stage}
              onChange={(newStage) => {
                const newStages = [...def.stages];
                newStages[i] = newStage;
                onChange({ ...def, stages: newStages });
              }}
            />
          </li>
        ))}
      </ol>
      <button
        onClick={() => {
          onChange({
            ...def,
            stages: [...def.stages, defaultFarmStageSpec("sapling")],
          });
        }}
      >
        Add Stage
      </button>
    </div>
  );
};

export const EditFarmingVariant: React.FunctionComponent<{
  def: Readonly<VariantFarmSpec>;
  onChange: (def: FarmSpec) => void;
}> = ({ def, onChange }) => {
  return (
    <div className={styles["complex-attribute"]}>
      <label>Water Interval</label>
      <DurationEditor
        timeMs={def.waterIntervalMs}
        onChange={(waterIntervalMs) => onChange({ ...def, waterIntervalMs })}
      />
      <label>Death Time</label>
      <DurationEditor
        timeMs={def.deathTimeMs}
        onChange={(deathTimeMs) => onChange({ ...def, deathTimeMs })}
      />
      <label>Crossbreeds</label>
      <CrossbreedingEditor
        crossbreeds={def.crossbreeds}
        onChange={(crossbreeds) => onChange({ ...def, crossbreeds })}
      />
      <ul>
        {def.variants.map(({ def: variant, chance }, i) => (
          <li key={i}>
            <div className={styles["compound-attribute"]}>
              <label className={styles["compound-main"]}>Variant {i}</label>
              <label>Chance</label>
              <input
                type="number"
                value={chance}
                onChange={(e) => {
                  const newVariants = [...def.variants];
                  newVariants[i] = {
                    def: variant,
                    chance: parseFloat(e.target.value),
                  };
                  onChange({ ...def, variants: newVariants });
                }}
              />
              <button
                onClick={() => {
                  const newVariants = [...def.variants];
                  newVariants.splice(i, 1);
                  onChange({ ...def, variants: newVariants });
                }}
              >
                Remove
              </button>
            </div>
            <EditFarming
              def={variant}
              onChange={(newDef) => {
                const newVariants = [...def.variants];
                if (newDef.kind !== "variant") {
                  // no nesting of variant def
                  newVariants[i].def = newDef;
                }
                onChange({ ...def, variants: newVariants });
              }}
            />
          </li>
        ))}
      </ul>
      <button
        onClick={() => {
          onChange({
            ...def,
            variants: [
              ...def.variants,
              {
                def: defaultFarmSpec("basic") as BasicFarmSpec,
                chance: 1,
              },
            ],
          });
        }}
      >
        Add Variant
      </button>
    </div>
  );
};
