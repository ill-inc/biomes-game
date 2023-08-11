import { useMatchingBiscuits } from "@/client/components/admin/bikkie/search";
import { DialogTypeaheadInput } from "@/client/components/system/DialogTypeaheadInput";
import type { BiomesId } from "@/shared/ids";
import { sortBy } from "lodash";
import { useMemo } from "react";

export const ChallengeDropDown: React.FunctionComponent<{
  id: BiomesId;
  onChange: (id: BiomesId) => void;
}> = ({ id, onChange }) => {
  const challenges = useMatchingBiscuits("/quests");
  const sortedChallenges = useMemo(() => {
    return sortBy(challenges, (e) => e.displayName ?? (e.name || String(e.id)));
  }, [challenges, challenges.length]);
  const currentlySelected = sortedChallenges.find((e) => e.id === id);
  return (
    <DialogTypeaheadInput
      value={currentlySelected}
      getDisplayName={(e) => e.displayName ?? (e.name || String(e.id))}
      options={sortedChallenges}
      onChange={(option) => {
        if (!option) {
          return;
        }

        if (option.id !== id) {
          onChange(option.id);
        }
      }}
    />
  );
};
