import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  ClickIcon,
  getClickIcon,
  ShortcutText,
} from "@/client/components/system/ShortcutText";

export const SpaceClipboardWandOverlay: React.FunctionComponent = () => {
  const { reactResources } = useClientContext();
  const [selection] = reactResources.useAll(["/hotbar/selection"]);
  const data = selection.item?.data;
  const isUnloaded = data === undefined;
  return (
    <div className="selection-inspect-overlay click-message">
      <div className="inspect">
        <div>
          <ShortcutText shortcut={<img src={getClickIcon("primary")} />}>
            Press <ClickIcon type="primary" /> to{" "}
            {isUnloaded ? "Copy" : "Paste"}
          </ShortcutText>
        </div>
        <div>
          <ShortcutText shortcut={<img src={getClickIcon("secondary")} />}>
            Press <ClickIcon type="secondary" /> to{" "}
            {isUnloaded ? "Cut" : "Discard"}
          </ShortcutText>
        </div>
      </div>

      <div className="inspect">
        <ShortcutText
          shortcut="F"
          keyCode="KeyF"
          onKeyDown={() => {
            reactResources.set("/space_clipboard/radius", {
              value: Math.max(
                1,
                reactResources.get("/space_clipboard/radius").value - 1
              ),
            });
          }}
        >
          Smaller
        </ShortcutText>
        <ShortcutText
          shortcut="G"
          keyCode="KeyG"
          onKeyDown={() => {
            reactResources.set("/space_clipboard/radius", {
              value: reactResources.get("/space_clipboard/radius").value + 1,
            });
          }}
        >
          Larger
        </ShortcutText>
      </div>
    </div>
  );
};
