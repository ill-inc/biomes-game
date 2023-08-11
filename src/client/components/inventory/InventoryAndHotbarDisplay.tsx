import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useInventoryAltClickContext } from "@/client/components/inventory/InventoryAltClickContext";
import { useInventoryControllerContext } from "@/client/components/inventory/InventoryControllerContext";
import { useInventoryOverrideContext } from "@/client/components/inventory/InventoryOverrideContext";
import { ItemTooltip } from "@/client/components/inventory/ItemTooltip";
import { NormalSlotWithTooltip } from "@/client/components/inventory/NormalSlotWithTooltip";
import {
  INVENTORY_COLS,
  useOwnedItems,
} from "@/client/components/inventory/helpers";
import type { DisableSlotPredicate } from "@/client/components/inventory/types";
import { useError } from "@/client/components/system/MaybeError";
import { resolveAssetUrl } from "@/galois/interface/asset_paths";
import type { SelfProfileResponse } from "@/pages/api/social/self_profile";
import type { UpdateProfilePictureRequest } from "@/pages/api/upload/profile_picture";
import { BikkieIds } from "@/shared/bikkie/ids";
import type {
  ItemBagReference,
  OwnedItemReference,
} from "@/shared/ecs/gen/types";
import {
  currencyBalance,
  currencyRefTo,
  maybeGetSlotByRef,
} from "@/shared/game/inventory";
import { countOf } from "@/shared/game/items";
import { jsonFetch, jsonPost } from "@/shared/util/fetch_helpers";
import { rowMajorIdx } from "@/shared/util/helpers";
import { formatCurrency } from "@/shared/util/view_helpers";
import { Img } from "@react-email/img";
import { range } from "lodash";
import React, { useCallback, useEffect, useRef } from "react";

export const InventoryAndHotbarDisplay: React.FC<{
  disableSlotPredicate?: DisableSlotPredicate;
}> = ({ disableSlotPredicate }) => {
  const { socialManager, reactResources, userId } = useClientContext();
  const ownedItems = useOwnedItems(reactResources, userId);
  const localInventory = reactResources.use("/ecs/c/inventory", userId)!;
  const derivedNumRows = Math.ceil(
    localInventory.items.length / INVENTORY_COLS
  );
  const {
    handleInventorySlotMouseOver,
    handleInventorySlotClick,
    handleInventorySlotKeyPress,
  } = useInventoryControllerContext();
  const [_error, setError] = useError(true);
  const currentProfilePicHash = useRef<string | null | undefined>();
  const profilePicPrep = useRef<[string, string] | undefined>();
  const { setAltClickUIForSlotRef: setShowSplitUIForSlotRef } =
    useInventoryAltClickContext();

  const inventoryOverrideContext = useInventoryOverrideContext();

  useEffect(() => {
    inventoryOverrideContext.clearOverrides();
    return () => {
      inventoryOverrideContext.clearOverrides();
      setShowSplitUIForSlotRef(undefined);
    };
  }, []);
  // Update the profile picture if the hash differs from server.
  // There is a race between self_profile returning and getting
  // a screenshot for an updated mesh (hence the refs)
  useEffect(() => {
    void (async () => {
      try {
        const profile = await jsonFetch<SelfProfileResponse>(
          `/api/social/self_profile`
        );
        currentProfilePicHash.current = profile.profilePicHash ?? null;
        if (profilePicPrep.current) {
          const [screenshot, hash] = profilePicPrep.current;
          if (hash !== currentProfilePicHash.current) {
            void updateProfilePicture(screenshot, hash);
          }
        }
      } catch (error: any) {
        setError(error);
      }
    })();
  }, []);
  const updateProfilePicture = useCallback(
    async (screenshot: string, hash: string) => {
      currentProfilePicHash.current = hash;
      try {
        await jsonPost<void, UpdateProfilePictureRequest>(
          "/api/upload/profile_picture",
          {
            photoDataURI: screenshot,
            hash,
          }
        );
        void socialManager.userInfoBundle(userId, true);
      } catch (error: any) {
        setError(error);
      }
    },
    []
  );

  const blingCurrencyRef = currencyRefTo(BikkieIds.bling) as ItemBagReference;
  const blingSlotRef: OwnedItemReference = {
    kind: "currency",
    ...blingCurrencyRef,
  };
  const blingOverride = inventoryOverrideContext.overrideAt(blingSlotRef);
  const blingSlot = blingOverride
    ? blingOverride.value
    : maybeGetSlotByRef(ownedItems, blingSlotRef);
  const blingSlotDisabled = disableSlotPredicate?.(blingSlot, blingSlotRef);
  return (
    <div className="inventory-cells normal">
      <div className="break-medium" />
      {range(derivedNumRows).map((row) => (
        <React.Fragment key={`row${row}`}>
          {range(INVENTORY_COLS).map((col) => {
            if (row == 2 && col > 6) return;
            const slotIdx = rowMajorIdx(INVENTORY_COLS, row, col);
            const slotReference: OwnedItemReference = {
              kind: "item",
              idx: slotIdx,
            };
            const override = inventoryOverrideContext.overrideAt(slotReference);
            const itemAndCount = override
              ? override.value
              : localInventory.items[slotIdx];
            return (
              <NormalSlotWithTooltip
                slotType={"inventory"}
                key={`row${row}-item-${col}`}
                extraClassName=""
                entityId={userId}
                slot={itemAndCount}
                slotReference={slotReference}
                disabled={disableSlotPredicate?.(itemAndCount, slotReference)}
                onClick={handleInventorySlotClick}
                onKeyPress={handleInventorySlotKeyPress}
                onMouseOver={handleInventorySlotMouseOver}
              />
            );
          })}
        </React.Fragment>
      ))}
      <ItemTooltip
        tooltip={`${formatCurrency(
          BikkieIds.bling,
          currencyBalance(localInventory, BikkieIds.bling),
          "locale"
        )} BLING`}
        tertiaryLabel="Right-click to split"
      >
        <div
          className={`cell inset cash two-wide ${
            blingSlotDisabled ? "disabled" : ""
          }`}
          onClick={(ev) => {
            handleInventorySlotClick(
              userId,
              currencyRefTo(BikkieIds.bling),
              blingSlot ?? countOf(BikkieIds.bling, 0n),
              ev,
              Boolean(blingSlotDisabled)
            );
          }}
          onContextMenu={(ev) => {
            ev.preventDefault();
            handleInventorySlotClick(
              userId,
              currencyRefTo(BikkieIds.bling),
              blingSlot ?? countOf(BikkieIds.bling, 0n),
              ev,
              Boolean(blingSlotDisabled)
            );
          }}
        >
          <Img src={resolveAssetUrl("icons/items/zeal")} />
          <span className="amount">
            {formatCurrency(
              BikkieIds.bling,
              blingSlot?.count ?? 0n,
              "abbreviated"
            )}
          </span>
        </div>
      </ItemTooltip>

      <div className="break-medium" />

      {localInventory.hotbar.map((item, col) => {
        const slotReference: OwnedItemReference = {
          kind: "hotbar",
          idx: col,
        };
        const override = inventoryOverrideContext.overrideAt(slotReference);
        const itemAndCount = override ? override.value : item;
        return (
          <NormalSlotWithTooltip
            slotType="inventory"
            key={`hotbar-${col}`}
            extraClassName="bg-[--cell-bg-dark] shadow-cell-inset-dark"
            entityId={userId}
            slot={itemAndCount}
            slotReference={slotReference}
            onClick={handleInventorySlotClick}
            onMouseOver={handleInventorySlotMouseOver}
            onKeyPress={handleInventorySlotKeyPress}
            disabled={disableSlotPredicate?.(itemAndCount, slotReference)}
            label={String(col === 9 ? 0 : col + 1)}
          />
        );
      })}
    </div>
  );
};
