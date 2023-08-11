import { ChallengeDropDown } from "@/client/components/admin/bikkie/attributes/ChallengeDropDown";
import type { ChallengeUnlockedStoredTriggerDefinition } from "@/shared/triggers/schema";

export const EditChallengeUnlockedTrigger: React.FunctionComponent<{
  def: Readonly<ChallengeUnlockedStoredTriggerDefinition>;
  onChange: (def: ChallengeUnlockedStoredTriggerDefinition) => void;
}> = ({ def, onChange }) => {
  return (
    <>
      <li>
        <ChallengeDropDown
          id={def.challenge}
          onChange={(newId) => {
            if (newId) {
              onChange({
                ...def,
                challenge: newId,
              });
            }
          }}
        />
      </li>
    </>
  );
};
