import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useInventoryAltClickContext } from "@/client/components/inventory/InventoryAltClickContext";
import { useInventoryDraggerContext } from "@/client/components/inventory/InventoryDragger";
import { DialogButton } from "@/client/components/system/DialogButton";
import {
  destroyInventoryItem,
  throwInventoryItem,
} from "@/client/game/helpers/inventory";
import {
  setCurrentBiscuit,
  setInlineAdminVisibility,
} from "@/client/game/resources/bikkie";
import type { KeyCode } from "@/client/game/util/keyboard";
import {
  elementAndParents,
  positionFixedElementRelativeToXY,
} from "@/client/util/dom_helpers";
import { cleanListener } from "@/client/util/helpers";
import { BikkieIds } from "@/shared/bikkie/ids";
import { isDroppableItem, isSplittableItem } from "@/shared/game/items";
import { fireAndForget } from "@/shared/util/async";
import { bigIntMin } from "@/shared/util/bigint";
import { ok } from "assert";
import { AnimatePresence } from "framer-motion";
import { includes } from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";
import trashIcon from "/public/hud/icon-16-trash.png";

export const InventoryAltClickUI: React.FunctionComponent<{
  shiftKeyDown?: boolean;
}> = ({ shiftKeyDown }) => {
  const splitterContext = useInventoryAltClickContext();
  const dragContext = useInventoryDraggerContext();
  const [quantity, setQuantity] = useState<bigint | undefined>();
  const rootRef = useRef<HTMLDivElement | null>();
  const quantityField = useRef<HTMLInputElement>(null);
  const clientContext = useClientContext();
  const { authManager, resources, reactResources } = clientContext;
  const isAdmin = authManager.currentUser.hasSpecialRole("admin");

  useEffect(() => {
    quantityField.current?.focus();
  });

  useEffect(() => {
    if (splitterContext.showAltClickUIForSlotRef) {
      return cleanListener(document, {
        mousedown: (ev) => {
          if (
            !rootRef.current ||
            !rootRef.current.contains(ev.target as HTMLElement)
          ) {
            // Cells handle this manually
            let hide = true;
            for (const ele of elementAndParents(ev.target as HTMLElement)) {
              if (includes(ele.classList ?? [], "cell")) {
                hide = false;
              }
            }
            if (hide) {
              splitterContext.setAltClickUIForSlotRef(undefined);
            }
          }
        },
      });
    }
  }, [splitterContext.showAltClickUIForSlotRef]);

  const handleSplit = useCallback(
    (amount: bigint) => {
      if (
        !splitterContext.altClickUISlot ||
        !splitterContext.showAltClickUIForSlotRef
      ) {
        return;
      }

      const trueQuantity = bigIntMin(
        amount,
        splitterContext.altClickUISlot.count
      );
      dragContext.setDragItem({
        kind: "inventory_drag",
        entityId: splitterContext.altClickUIEntityId!,
        slot: splitterContext.altClickUISlot,
        slotReference: splitterContext.showAltClickUIForSlotRef,
        quantity: trueQuantity,
      });
    },
    [splitterContext.altClickUISlot, splitterContext.showAltClickUIForSlotRef]
  );

  const placeAtClickPoint = useCallback(
    (element: HTMLDivElement | null) => {
      rootRef.current = element;
      const clickPoint = splitterContext.altClickUIClickPoint;
      if (!clickPoint || !element) {
        return;
      }
      positionFixedElementRelativeToXY(
        element,
        clickPoint.clientX,
        clickPoint.clientY,
        {
          baseOffsetX: 20,
          baseOffsetY: -20,
        }
      );
    },
    [splitterContext.altClickUIClickPoint]
  );

  const canDestroy =
    splitterContext.altClickUISlot?.item.id !== BikkieIds.bling;

  const validSplitAmount = quantity ? quantity > 0n : false;

  const soulbound =
    !splitterContext.altClickUISlot?.item ||
    !isDroppableItem(splitterContext.altClickUISlot.item);

  const [confirmDestroy, setConfirmDestroy] = useState(false);

  const count = Math.floor(Number(splitterContext.altClickUISlot?.count ?? 0n));

  const destoryItem = () => {
    ok(
      splitterContext.altClickUIEntityId &&
        splitterContext.showAltClickUIForSlotRef
    );
    fireAndForget(
      destroyInventoryItem(
        clientContext,
        splitterContext.altClickUIEntityId,
        splitterContext.showAltClickUIForSlotRef,
        quantity
      )
    );
    splitterContext.setAltClickUIForSlotRef(undefined);
  };

  const [holdingShift, setHoldingShift] = useState(shiftKeyDown ?? false);
  useEffect(
    () =>
      cleanListener(window, {
        keydown: (event: KeyboardEvent) => {
          if (event.shiftKey) {
            setHoldingShift(true);
          }
        },
        keyup: (event: KeyboardEvent) => {
          if (!event.shiftKey) {
            setHoldingShift(false);
          }
        },
      }),
    []
  );

  return (
    <div className="biomes-box inventory-context-menu" ref={placeAtClickPoint}>
      {isSplittableItem(splitterContext.altClickUISlot) && (
        <>
          <div className="inventory-splitter menu-item label">
            <input
              type="number"
              max={count}
              min={0}
              ref={quantityField}
              value={quantity ? Number(quantity) : ""}
              onChange={(e) => {
                if (!e.target.value) {
                  setQuantity(undefined);
                } else {
                  if (parseInt(e.target.value) > count) {
                    setQuantity(BigInt(count));
                  } else {
                    setQuantity(BigInt(parseInt(e.target.value, 10)));
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.repeat) return;
                const lk = e.code as KeyCode;
                if (lk == "Enter") {
                  if (quantity) {
                    handleSplit(quantity);
                    splitterContext.setAltClickUIForSlotRef(undefined);
                  }
                }
              }}
              placeholder="Quantity"
            />
            <DialogButton
              disabled={!validSplitAmount}
              onClick={() => {
                if (quantity) {
                  handleSplit(quantity);
                  splitterContext.setAltClickUIForSlotRef(undefined);
                }
              }}
            >
              Split
            </DialogButton>
          </div>
          <div className="divider" />
        </>
      )}
      {(!splitterContext.altClickUISlot?.item ||
        !isDroppableItem(splitterContext.altClickUISlot.item)) && (
        <div className="menu-item label soulbound">Bound to you</div>
      )}

      <button
        className={`drop menu-item left-text ${soulbound ? "disabled" : ""}`}
        disabled={
          !splitterContext.altClickUISlot?.item ||
          !isDroppableItem(splitterContext.altClickUISlot?.item)
        }
        onClick={() => {
          ok(
            splitterContext.altClickUIEntityId &&
              splitterContext.showAltClickUIForSlotRef
          );
          fireAndForget(
            throwInventoryItem(
              clientContext,
              splitterContext.altClickUIEntityId,
              splitterContext.showAltClickUIForSlotRef,
              quantity
            )
          );
          splitterContext.setAltClickUIForSlotRef(undefined);
        }}
      >
        Drop
      </button>
      {isAdmin && (
        <button
          className={`drop menu-item left-text ${soulbound ? "disabled" : ""}`}
          onClick={() => {
            setInlineAdminVisibility(reactResources, "bikkie");
            setCurrentBiscuit(
              resources,
              splitterContext.altClickUISlot?.item.id
            );
          }}
        >
          Bikkie
        </button>
      )}
      {canDestroy && (
        <>
          <button
            className={`destructive menu-item left-text ${
              soulbound ? "disabled" : ""
            }`}
            disabled={
              !splitterContext.altClickUISlot?.item ||
              !isDroppableItem(splitterContext.altClickUISlot?.item)
            }
            onClick={(e) => {
              if (e.shiftKey) {
                destoryItem();
              } else {
                setConfirmDestroy(!confirmDestroy);
              }
            }}
          >
            <>
              {confirmDestroy
                ? "Cancel"
                : `Destroy${!holdingShift ? "..." : ""}`}
            </>
          </button>
          <AnimatePresence>
            {confirmDestroy && (
              <div className="menu-item confirm-destroy">
                <DialogButton
                  onClick={() => {
                    destoryItem();
                  }}
                  size="small"
                  type="destructive"
                >
                  <img src={trashIcon.src} />
                </DialogButton>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};
