import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { InspectShortcuts } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CursorInspectionComponent } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import { CurrencyWithGlyph } from "@/client/components/system/CurrencyWithGlyph";
import type { PlaceableInspectOverlay } from "@/client/game/resources/overlays";
import { BikkieIds } from "@/shared/bikkie/ids";
import { countOf } from "@/shared/game/items";

export const ShopOverlayComponent: React.FunctionComponent<{
  overlay: PlaceableInspectOverlay;
}> = ({ overlay }) => {
  const { reactResources } = useClientContext();

  const containerInventory = reactResources.use(
    "/ecs/c/priced_container_inventory",
    overlay.entityId
  );
  if (!containerInventory) {
    return <></>;
  }

  const item = containerInventory?.items[0];
  const title = item ? item.contents.item.displayName : undefined;
  const subtitle = (
    <CurrencyWithGlyph
      itemAndCount={item?.price ?? countOf(BikkieIds.bling, 0n)}
      option="hide_zeros"
    />
  );
  const shortcuts: InspectShortcuts = [];

  shortcuts.push({
    title: "Open Shop",
    onKeyDown: () => {
      reactResources.set("/game_modal", {
        kind: "generic_miniphone",
        rootPayload: {
          type: "shop_container",
          placeableId: overlay.entityId,
          itemId: overlay.itemId,
        },
      });
    },
  });

  return (
    <CursorInspectionComponent
      extraClassName="shop-inspect"
      overlay={overlay}
      title={title}
      subtitle={subtitle}
      shortcuts={shortcuts}
    />
  );
};
