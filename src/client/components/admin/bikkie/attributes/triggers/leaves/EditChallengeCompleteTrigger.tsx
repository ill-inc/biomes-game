import { ChallengeDropDown } from "@/client/components/admin/bikkie/attributes/ChallengeDropDown";
import type { ChallengeCompleteStoredTriggerDefinition } from "@/shared/triggers/schema";

export const EditChallengeCompleteTrigger: React.FunctionComponent<{
  def: Readonly<ChallengeCompleteStoredTriggerDefinition>;
  onChange: (def: ChallengeCompleteStoredTriggerDefinition) => void;
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
