import { InventoryCellContents } from "@/client/components/inventory/InventoryCellContents";
import type { DragItem } from "@/client/util/drag_helpers";
import { cleanListener } from "@/client/util/helpers";
import type { ItemSlot } from "@/shared/ecs/gen/types";
import { assertNever } from "@/shared/util/type_helpers";
import { kebabCase } from "lodash";
import type { PropsWithChildren } from "react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export const InventoryDraggerContext = createContext({
  dragItem: null as null | DragItem,
  setDragItem: (_dragItem: null | DragItem) => {},
});

export const useInventoryDraggerContext = () =>
  useContext(InventoryDraggerContext);

export const DragItemRender: React.FunctionComponent<
  PropsWithChildren<{
    dragItem: DragItem | null;
    extraClasses?: string[];
  }>
> = ({ dragItem, extraClasses, children }) => {
  if (!dragItem) {
    return <></>;
  }

  let inventoryItem!: ItemSlot;
  switch (dragItem.kind) {
    case "inventory_drag":
      inventoryItem = dragItem.slot;
      break;
    case "inventory_overflow":
      inventoryItem = dragItem.item;
      break;
    case "ephemeral":
      inventoryItem = dragItem.item;
      break;

    default:
      assertNever(dragItem);
  }

  return (
    <>
      <div
        className={`cell drag ${kebabCase(dragItem.kind)} ${
          extraClasses ? extraClasses.join(" ") : ""
        }`}
      >
        <InventoryCellContents
          slot={inventoryItem}
          overrideCount={dragItem.quantity}
        />
      </div>
      {children}
    </>
  );
};

export const InventoryDragger: React.FunctionComponent<
  PropsWithChildren<{
    onDrag: (x: number, y: number) => void;
    extraClasses?: string[];
  }>
> = ({ onDrag, extraClasses, children }) => {
  const { dragItem } = useInventoryDraggerContext();
  const mouseFollowDivRef = useRef<HTMLDivElement>(null);
  const [didMousedown, setDidmousedown] = useState(false);

  const offsetX = 0;
  const offsetY = 10;

  const adjustToMouse = useCallback(
    ({ clientX, clientY }: { clientX: number; clientY: number }) => {
      const followDiv = mouseFollowDivRef.current;
      if (followDiv) {
        followDiv.style.display = "";
        const rect = followDiv.getBoundingClientRect();
        followDiv.style.left = `${clientX - rect.width / 2 - offsetX}px`;
        followDiv.style.top = `${clientY - rect.height / 2 - offsetY}px`;
      }
      onDrag(clientX, clientY);
    },
    [onDrag]
  );

  const mouseDown = () => {
    setDidmousedown(true);
  };

  useEffect(() => {
    if (!dragItem) {
      document.body.classList.remove("dragging");
      if (mouseFollowDivRef.current) {
        mouseFollowDivRef.current.style.display = "none";
      }
      return;
    }

    document.body.classList.add("dragging");
    if (dragItem.clickOrigin) {
      adjustToMouse(dragItem.clickOrigin);
    }
    return cleanListener(document, {
      mousemove: adjustToMouse,
      mousedown: mouseDown,
    });
  }, [dragItem, didMousedown]);

  return (
    <div
      className="inventory-dragger-content"
      ref={mouseFollowDivRef}
      style={{ display: "none" }}
    >
      <DragItemRender dragItem={dragItem} extraClasses={extraClasses}>
        {children}
      </DragItemRender>
    </div>
  );
};
