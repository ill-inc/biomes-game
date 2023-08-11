import type { MetaquestPoints } from "@/shared/bikkie/schema/types";
import { toNumber } from "lodash";
import { BiscuitIdEditor } from "@/client/components/admin/bikkie/attributes/BiscuitIdEditor";
import { INVALID_BIOMES_ID } from "@/shared/ids";

export const MetaquestPointsEditor: React.FunctionComponent<{
  value: MetaquestPoints[];
  onChange: (value: MetaquestPoints[]) => void;
}> = ({ value, onChange }) => {
  return (
    <div className={""}>
      {value.map(({ metaquest, points }, index) => {
        return (
          <div key={metaquest} className={"flex"}>
            <BiscuitIdEditor
              schema={"/metaquests"}
              value={metaquest}
              nullItem={"DELETE"}
              onChange={(newMetaquest) => {
                if (newMetaquest !== INVALID_BIOMES_ID) {
                  value[index].metaquest = newMetaquest;
                } else {
                  value.splice(index, 1);
                }
                onChange(value);
              }}
            />
            <input
              type="number"
              value={points}
              onChange={(e) => {
                value[index].points = toNumber(e.target.value);
                onChange(value);
              }}
            />
          </div>
        );
      })}
      <BiscuitIdEditor
        schema="/metaquests"
        value={INVALID_BIOMES_ID}
        nullItem="Add Quest"
        onChange={(newQuest) => {
          value.push({ metaquest: newQuest, points: 0 });
          onChange(value);
        }}
      />
    </div>
  );
};
