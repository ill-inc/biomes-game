import { GameStatePredicatesEditor } from "@/client/components/admin/bikkie/attributes/GameStatePredicateEditor";
import { LootProbabilityEditor } from "@/client/components/admin/bikkie/attributes/LootProbabilityEditor";
import { DialogButton } from "@/client/components/system/DialogButton";
import type { FishCondition } from "@/shared/bikkie/schema/types";
import type { FishingGameStatePredicate } from "@/shared/loot_tables/predicates";
import { zFishingGameStatePredicate } from "@/shared/loot_tables/predicates";

export const FishConditionsEditor: React.FunctionComponent<{
  value: FishCondition[];
  onChange: (value: FishCondition[]) => void;
}> = ({ value, onChange }) => {
  return (
    <>
      {value.map(({ predicates, probability }, i) => (
        <div key={i} className={"rounded mb-2 flex flex-col bg-off-black p-1"}>
          <div className="flex">
            <label className="flex-grow">Conditions</label>
            <div className="flex-initial">
              <DialogButton
                extraClassNames={"flex-initial text-sm"}
                type="destructive"
                size="xsmall"
                onClick={() => {
                  if (value.length === 1) {
                    onChange([{ predicates: [], probability: "common" }]);
                  } else {
                    onChange([...value.slice(0, value.length - 1)]);
                  }
                }}
              >
                Delete
              </DialogButton>
            </div>
          </div>
          <GameStatePredicatesEditor
            value={predicates}
            predicateSchema={zFishingGameStatePredicate}
            onChange={(newPredicates) => {
              onChange([
                ...value.slice(0, i),
                {
                  predicates: newPredicates as FishingGameStatePredicate[],
                  probability,
                },
                ...value.slice(i + 1),
              ]);
            }}
          />
          <label>Probability</label>
          <LootProbabilityEditor
            value={probability}
            onChange={(newProbability) => {
              onChange([
                ...value.slice(0, i),
                { predicates, probability: newProbability },
                ...value.slice(i + 1),
              ]);
            }}
          />
        </div>
      ))}
      <button
        onClick={() => {
          onChange([
            ...value,
            {
              predicates: [],
              probability: "common",
            },
          ]);
        }}
      >
        Add Condition Group (Or)
      </button>
    </>
  );
};
