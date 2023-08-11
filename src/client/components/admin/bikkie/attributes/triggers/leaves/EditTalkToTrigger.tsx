import {
  ItemBagArrayEditor,
  ItemBagEditor,
} from "@/client/components/admin/bikkie/attributes/ItemBagEditor";
import { QuestGiverEditor } from "@/client/components/admin/bikkie/attributes/QuestGiverEditor";
import { ZfsString } from "@/client/components/admin/zod_form_synthesis/ZfsString";
import { bagSpecToBag, bagToBagSpec } from "@/shared/game/items";
import type {
  ChallengeClaimRewardsTriggerDefinition,
  CompleteQuestStepAtMyRobotTriggerDefinition,
} from "@/shared/triggers/schema";
import { z } from "zod";

export const EditTalkToTrigger: React.FunctionComponent<{
  def: Readonly<
    | ChallengeClaimRewardsTriggerDefinition
    | CompleteQuestStepAtMyRobotTriggerDefinition
  >;
  onChange: (
    def:
      | ChallengeClaimRewardsTriggerDefinition
      | CompleteQuestStepAtMyRobotTriggerDefinition
  ) => void;
}> = ({ def, onChange }) => {
  return (
    <div className="flex w-full flex-col gap-[18px]">
      {def.kind === "challengeClaimRewards" && (
        <li>
          <label>NPC</label>
          <QuestGiverEditor
            value={def.returnNpcTypeId}
            onChange={(entityId) => {
              if (entityId) {
                onChange({
                  ...def,
                  returnNpcTypeId: entityId,
                });
              }
            }}
          />
        </li>
      )}
      {def.kind === "completeQuestStepAtMyRobot" && (
        <li>
          <label>Message Transmission Text</label>
          <ZfsString
            schema={z.string()}
            onChangeRequest={(newValue) =>
              onChange({ ...def, transmissionText: newValue })
            }
            value={def.transmissionText ?? ""}
          />
        </li>
      )}
      <li style={{ display: "flex", gap: "10px" }}>
        <label>Use Default Nav Aid</label>
        <input
          type="checkbox"
          defaultChecked={def?.allowDefaultNavigationAid ?? true}
          onChange={(e) => {
            onChange({
              ...def,
              allowDefaultNavigationAid: e.target.checked,
            });
          }}
          style={{ height: "20px", width: "20px" }}
        />
      </li>
      <li>
        <label>Reward</label>
        <ItemBagArrayEditor
          bagArray={def.rewardsList ?? []}
          onChange={(newBag) => onChange({ ...def, rewardsList: newBag })}
        />
      </li>
      <li>
        <label>Items to Take From Player</label>
        <ItemBagEditor
          bag={bagSpecToBag(def.itemsToTake ?? [])}
          onChange={(newBag) =>
            onChange({ ...def, itemsToTake: bagToBagSpec(newBag) })
          }
        />
      </li>
      <li>
        <label>Custom Accept Text</label>
        <ZfsString
          schema={z.string()}
          onChangeRequest={(newValue) =>
            onChange({ ...def, acceptText: newValue })
          }
          value={def.acceptText ?? ""}
        />
      </li>
      <li>
        <label>Custom Decline Text</label>
        <ZfsString
          schema={z.string()}
          onChangeRequest={(newValue) =>
            onChange({ ...def, declineText: newValue })
          }
          value={def.declineText ?? ""}
        />
      </li>
    </div>
  );
};
