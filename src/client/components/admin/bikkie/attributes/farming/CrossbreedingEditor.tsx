import { BiscuitDropDown } from "@/client/components/admin/bikkie/attributes/BiscuitDropDown";
import { useMatchingBiscuits } from "@/client/components/admin/bikkie/search";
import styles from "@/client/styles/admin.bikkie.module.css";
import type { CrossbreedChance, CrossbreedSpec } from "@/shared/game/farming";
import { zCrossbreedChance } from "@/shared/game/farming";

export const CrossbreedingEditor: React.FunctionComponent<{
  crossbreeds: ReadonlyArray<CrossbreedSpec> | undefined;
  onChange: (crossbreeds: CrossbreedSpec[]) => void;
}> = ({ crossbreeds, onChange }) => {
  return (
    <div className={styles["complex-attribute"]}>
      <ul>
        {crossbreeds?.map((crossbreed, i) => (
          <li key={i}>
            <CrossbreedEntry
              crossbreed={crossbreed}
              onChange={(newCrossbreed) => {
                if (newCrossbreed) {
                  const newCrossbreeds = crossbreeds?.slice() ?? [];
                  newCrossbreeds[i] = newCrossbreed;
                  onChange(newCrossbreeds);
                } else {
                  onChange(crossbreeds?.filter((_, j) => j !== i) ?? []);
                }
              }}
            />
          </li>
        ))}
      </ul>
      <button
        onClick={() => {
          onChange([...(crossbreeds ?? []), { seeds: [], chance: "low" }]);
        }}
      >
        Add Crossbreed
      </button>
    </div>
  );
};

const CrossbreedEntry: React.FunctionComponent<{
  crossbreed: CrossbreedSpec;
  onChange: (crossbreed: CrossbreedSpec | undefined) => void;
}> = ({ crossbreed, onChange }) => {
  const seedBiscuits = useMatchingBiscuits("/items/seed");
  return (
    <div className={styles["compound-attribute"]}>
      <label>Chance</label>
      <select
        value={crossbreed.chance}
        onChange={(e) => {
          if (e.target.value === "remove") {
            onChange(undefined);
            return;
          }
          onChange({
            ...crossbreed,
            chance: e.target.value as CrossbreedChance,
          });
        }}
      >
        <option key={"remove"} value={"remove"}>
          Remove
        </option>
        {Object.keys(zCrossbreedChance.Values).map((chance) => (
          <option key={chance} value={chance}>
            {chance}
          </option>
        ))}
      </select>
      <label>Seeds</label>
      <ul className={styles["compound-main"]}>
        {crossbreed.seeds.map((seed, i) => (
          <li key={i}>
            <BiscuitDropDown
              biscuits={seedBiscuits}
              selected={seed}
              nullItem="Remove"
              onSelect={(newSeed) => {
                const seeds = [...crossbreed.seeds];
                if (newSeed) {
                  seeds[i] = newSeed;
                } else {
                  seeds.splice(i, 1);
                }
                onChange({ ...crossbreed, seeds });
              }}
            />
          </li>
        ))}
      </ul>
      <button
        onClick={() => {
          const seeds = [...crossbreed.seeds, seedBiscuits[0].id];
          onChange({ ...crossbreed, seeds });
        }}
      >
        Add Seed
      </button>
    </div>
  );
};
