import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { CraftingBundle } from "@/client/components/inventory/crafting/helpers";
import {
  performCraft,
  stationOk,
} from "@/client/components/inventory/crafting/helpers";
import { RecipeTooltipContent } from "@/client/components/inventory/crafting/RecipeTooltipContent";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import type { Item } from "@/shared/ecs/gen/types";
import type { CraftingContext } from "@/shared/game/crafting";
import { craftingTimeMs } from "@/shared/game/crafting";
import type { BiomesId } from "@/shared/ids";
import { mapMap } from "@/shared/util/collections";
import { formatItemCount } from "@/shared/util/view_helpers";
import type { Variants } from "framer-motion";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ItemIcon } from "@/client/components/inventory/ItemIcon";
import { anItem } from "@/shared/game/item";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { orify } from "@/shared/util/text";
import checkmark from "/public/hud/icon-check-12.png";

export const RecipeRow: React.FunctionComponent<{
  craftingBundle: CraftingBundle;
  onClick: (recipe: Item) => void;
  onCraft?: (recipe: Item) => void;
  tooltip?: JSX.Element;
  stationEntityId?: BiomesId;
}> = ({ craftingBundle, onClick, onCraft, tooltip, stationEntityId }) => {
  const clientContext = useClientContext();
  const { resources } = clientContext;
  const [error, setError] = useError();

  const stationItem = relevantBiscuitForEntityId(resources, stationEntityId);
  const craftingContext: CraftingContext = {
    recipe: craftingBundle.item,
    stationItem: stationItem,
    stationEntityId: stationEntityId,
  };

  const [isCrafting, setIsCrafting] = useState(false);
  const craftAbortController = useRef(new AbortController());
  const doCraft = useCallback(async () => {
    setIsCrafting(true);
    craftAbortController.current = new AbortController();
    try {
      await performCraft(
        clientContext,
        craftingContext,
        craftAbortController.current
      );
      onCraft?.(craftingBundle.item);
    } catch (error: any) {
      setError(error);
    } finally {
      setIsCrafting(false);
    }
  }, [craftingBundle, stationEntityId]);

  useEffect(() => {
    return () => {
      craftAbortController.current.abort();
    };
  }, []);

  const outputItemCount = useMemo(() => {
    return mapMap(craftingBundle.output, (output) =>
      formatItemCount(output)
    ).join(", ");
  }, [craftingBundle]);

  const fullTooltip = (
    <>
      <div className="tooltip-title">{craftingBundle.name}</div>
      <div className="secondary-label">
        {!stationOk(craftingBundle.item, stationItem) && (
          <>
            Requires{" "}
            {orify(
              craftingBundle.craftWith
                .filter((s) => s != stationItem?.id)
                .map((s) => anItem(s).displayName)
            )}
          </>
        )}
      </div>
      {tooltip || <RecipeTooltipContent recipe={craftingBundle.item} />}
    </>
  );

  const [doubleClickCheck, setDoubleClickCheck] = useState(false);
  const doubleClickRef = useRef(doubleClickCheck);
  doubleClickRef.current = doubleClickCheck;

  const handleClickAndDoubleClick = useCallback(
    (ev: React.MouseEvent, recipe: Item) => {
      if (ev.detail == 1) {
        setTimeout(() => {
          if (!doubleClickRef.current.valueOf()) {
            onClick(recipe);
          } else {
            setDoubleClickCheck(false);
          }
        }, 200);
      }
      if (ev.detail == 2 && !isCrafting && craftingBundle.canCraft) {
        void doCraft();
        setDoubleClickCheck(true);
      }
    },
    [doubleClickCheck, craftingBundle, isCrafting]
  );

  const craftingDuration = craftingTimeMs(craftingContext) / 1000;
  const craftCheckAnimation: Variants = {
    initial: {
      scale: 0,
      opacity: 0,
      x: "-50%",
      y: "-50%",
    },
    done: {
      opacity: 1,
      scale: 1,
      x: "-50%",
      y: "-50%",
      transition: { delay: craftingDuration - 0.01 },
    },
    exit: {
      opacity: 0,
      scale: 0,
      transition: { delay: craftingDuration + 0.5 },
    },
  };

  return (
    <Tooltipped tooltip={fullTooltip}>
      <motion.li
        whileTap={{ scale: 0.95 }}
        onClick={(ev) => {
          handleClickAndDoubleClick(ev, craftingBundle.item);
        }}
        className={`recipe-row ${
          craftingBundle.canCraft ? "craftable" : "uncraftable"
        } ${isCrafting ? "is-crafting" : ""}`}
      >
        <ItemIcon item={craftingBundle.item} />
        {outputItemCount && outputItemCount != "1" && (
          <div className="amount-overlay">{outputItemCount}</div>
        )}
        {isCrafting && (
          <div className="biomes-box crafting-progress-container">
            {craftingDuration}
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: craftingDuration }}
              className="crafting-progress-bar"
            />
          </div>
        )}
        <AnimatePresence mode="wait">
          {isCrafting && (
            <motion.div
              variants={craftCheckAnimation}
              initial="initial"
              animate="done"
              exit="exit"
              className="biomes-box crafting-check"
            >
              <img src={checkmark.src} />
            </motion.div>
          )}
        </AnimatePresence>

        <MaybeError error={error} />
      </motion.li>
    </Tooltipped>
  );
};
