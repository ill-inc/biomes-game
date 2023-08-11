import { useMatchingBiscuits } from "@/client/components/admin/bikkie/search";
import { ZfsAny } from "@/client/components/admin/zod_form_synthesis/ZfsAny";
import type { Buffs, BuffsAndProbabilities } from "@/shared/game/buff_specs";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import { isEqual } from "lodash";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

const NO_BUFF_NAME = "-";

export const BuffsAndProbabilitiesAttributeEditor: React.FunctionComponent<{
  value: BuffsAndProbabilities;
  onChange: (value: BuffsAndProbabilities) => void;
}> = ({ value, onChange }) => {
  const allBuffs = useMatchingBiscuits("/buffs");

  const zod = useMemo(
    () =>
      allBuffs.length > 0
        ? z
            .tuple([
              z.enum([NO_BUFF_NAME, ...allBuffs.map((x) => x.name).sort()]),
              z.number(),
            ])
            .default(() => [NO_BUFF_NAME, 1] as [string, number])
            .array()
        : undefined,
    [allBuffs]
  );

  const [originalValue, setOriginalValue] = useState<
    BuffsAndProbabilities | undefined
  >(undefined);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    if (isEqual(value, originalValue)) {
      return;
    }
    setOriginalValue(value);
    setCurrentValue(value);
  }, [value]);

  const namedBuffs = useMemo(
    () =>
      currentValue.map(
        ([id, chance]) =>
          [allBuffs.find((x) => x.id === id)?.name ?? NO_BUFF_NAME, chance] as [
            string,
            number
          ]
      ),
    [currentValue, allBuffs]
  );

  if (zod === undefined) {
    return <div>No buffs available</div>;
  }
  return (
    <ZfsAny
      schema={zod}
      value={namedBuffs}
      onChangeRequest={(newValue) => {
        const newRawBuffs: BuffsAndProbabilities = [];
        const newBuffs: BuffsAndProbabilities = [];
        for (const [name, chance] of newValue) {
          if (name === NO_BUFF_NAME) {
            newRawBuffs.push([INVALID_BIOMES_ID, chance]);
            continue;
          }
          const buff = allBuffs.find((x) => x.name === name);
          if (buff === undefined) {
            newRawBuffs.push([INVALID_BIOMES_ID, chance]);
            continue;
          }
          newRawBuffs.push([buff.id, chance]);
          newBuffs.push([buff.id, chance]);
        }
        setCurrentValue(newRawBuffs);
        onChange(newBuffs);
      }}
    />
  );
};

export const BuffsAttributeEditor: React.FunctionComponent<{
  value: Buffs;
  onChange: (value: Buffs) => void;
}> = ({ value, onChange }) => {
  const allBuffs = useMatchingBiscuits("/buffs");

  const zod =
    allBuffs.length > 0
      ? z
          .enum([NO_BUFF_NAME, ...allBuffs.map((buff) => buff.name).sort()])
          .default(allBuffs[0].name)
          .array()
      : undefined;

  if (zod === undefined) {
    return <div>No buffs available</div>;
  }

  return (
    <ZfsAny
      schema={zod}
      value={value.map(
        (id) => allBuffs.find((x) => x.id === id)?.name ?? NO_BUFF_NAME
      )}
      onChangeRequest={(newValue) => {
        const a = newValue
          .filter((b) => b !== NO_BUFF_NAME)
          .map((b) => {
            const buff = allBuffs.find((x) => x.name === b);
            if (buff === undefined) {
              return INVALID_BIOMES_ID;
            }
            return buff.id;
          });

        onChange(a);
      }}
    />
  );
};
