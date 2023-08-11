import { MiniMapHUD } from "@/client/components/MiniMapHUD";
import { RulesetToggleable } from "@/client/components/RulsetToggleable";
import { QuestsHUD } from "@/client/components/challenges/QuestsHUD";

export const QuestsAndMiniMapHUD: React.FunctionComponent<{}> = ({}) => {
  return (
    <div className="absolute bottom-0.8 right-0.8 flex flex-col items-end gap-2">
      <RulesetToggleable name="challenges">
        <QuestsHUD />
      </RulesetToggleable>
      <RulesetToggleable name="minimap">
        <MiniMapHUD />
      </RulesetToggleable>
    </div>
  );
};
