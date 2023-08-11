import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  ClickIcon,
  ShortcutText,
  getClickIcon,
} from "@/client/components/system/ShortcutText";

export const BecomeNpcOverlayComponent: React.FunctionComponent<{}> = ({}) => {
  const { reactResources } = useClientContext();
  const becomeNpc = reactResources.use("/scene/npc/become_npc");
  const cannotPlaceReason =
    becomeNpc.kind === "active" && becomeNpc.cannotPlaceReason;

  return (
    <div className="selection-inspect-overlay click-message">
      <div className="inspect error mb-1">{cannotPlaceReason}</div>
      <div className="inspect">
        <ShortcutText
          disabled={Boolean(cannotPlaceReason)}
          shortcut={<img src={getClickIcon("primary")} />}
        >
          <ClickIcon type="primary" /> to Place
        </ShortcutText>
        <ShortcutText shortcut={<img src={getClickIcon("secondary")} />}>
          <ClickIcon type="secondary" /> to Cancel
        </ShortcutText>
      </div>
    </div>
  );
};
