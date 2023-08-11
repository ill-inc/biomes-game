import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  hasPreviewHologram,
  itemIsExclusivelyGroup,
} from "@/client/components/inventory/helpers";
import {
  ClickIcon,
  ShortcutText,
  getClickIcon,
} from "@/client/components/system/ShortcutText";
import { slotRefFromSelection } from "@/client/game/resources/inventory";
import { actualizePlaceablePreview } from "@/client/game/scripts/group_placement";
import { useEffect, useMemo, useState } from "react";

export const GroupPlaceObjectOverlay: React.FunctionComponent = () => {
  const { reactResources, events, authManager, userId, permissionsManager } =
    useClientContext();
  const [activationAllowed, setActivationAllowed] = useState(false);
  const [selection, groupPlacementPreview, clock, cursor] =
    reactResources.useAll(
      ["/hotbar/selection"],
      ["/groups/placement/preview"],
      ["/clock"],
      ["/scene/cursor"]
    );
  const showCloneShortcut = useMemo(
    () =>
      authManager.currentUser.hasSpecialRole("clone") &&
      itemIsExclusivelyGroup(selection.item),
    [selection]
  );

  useEffect(() => {
    if (selection.item && selection.item.isBlueprint) {
      const playerHasRequiredItems = reactResources.get(
        "/groups/blueprint/has_required_items",
        selection.item.id
      );
      setActivationAllowed(playerHasRequiredItems);
    } else {
      setActivationAllowed(true);
    }
  }, [selection, clock.time, cursor]);

  if (!hasPreviewHologram(selection.item)) {
    return <></>;
  }

  return (
    <>
      {activationAllowed && (
        <div className="selection-inspect-overlay click-message">
          <div className="inspect">
            {!groupPlacementPreview.active() && activationAllowed && (
              <ShortcutText shortcut={<img src={getClickIcon("primary")} />}>
                <ClickIcon type="primary" /> to Start Placing
              </ShortcutText>
            )}
            {groupPlacementPreview.active() &&
              (groupPlacementPreview.canActualize ? (
                <>
                  <ShortcutText
                    shortcut={<img src={getClickIcon("primary")} />}
                  >
                    <ClickIcon type="primary" /> to Place
                  </ShortcutText>
                  <ShortcutText shortcut="F">Flip</ShortcutText>
                  <ShortcutText shortcut="G">Mirror</ShortcutText>
                  {showCloneShortcut && (
                    <ShortcutText
                      shortcut="H"
                      keyCode="KeyH"
                      onKeyDown={() => {
                        const selection =
                          reactResources.get("/hotbar/selection");
                        if (!selection.item) {
                          return;
                        }
                        actualizePlaceablePreview(
                          reactResources,
                          permissionsManager,
                          events,
                          userId,
                          selection.item,
                          slotRefFromSelection(selection)!,
                          { clone: true }
                        );
                      }}
                    >
                      Clone Build
                    </ShortcutText>
                  )}
                </>
              ) : (
                <div className="error placement-error">
                  {groupPlacementPreview.cannotActualizeReason}
                </div>
              ))}
          </div>
        </div>
      )}
    </>
  );
};
