import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  ShortcutText,
  getClickIcon,
} from "@/client/components/system/ShortcutText";
import type { NavigationAidSpec } from "@/client/game/helpers/navigation_aids";
import { TIMED_NUX_TIME_MS } from "@/client/util/nux/helpers";
import type { NUXStates } from "@/client/util/nux/state_machines";
import { NUXES } from "@/client/util/nux/state_machines";
import { getTypedStorageItem } from "@/client/util/typed_local_storage";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { assertNever } from "@/shared/util/type_helpers";
import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import type { PropsWithChildren, ReactChild, ReactElement } from "react";
import React, { useEffect } from "react";
import mainQuestMarkAccepted from "/public/hud/quest-marker-main-accepted.png";

import { ItemIcon } from "@/client/components/inventory/ItemIcon";
import { BikkieIds } from "@/shared/bikkie/ids";
import { reportFunnelStage } from "@/shared/funnel";
import { startCase } from "lodash";

export function getPrimaryClickButton() {
  return getTypedStorageItem("settings.mouse.togglePrimaryClick")
    ? "right"
    : "left";
}

export function getSecondaryClickButton() {
  return getTypedStorageItem("settings.mouse.togglePrimaryClick")
    ? "left"
    : "right";
}

export const NUXLeft: React.FunctionComponent<PropsWithChildren<{}>> = ({
  children,
}) => {
  return <>{children}</>;
};

export const NUXClickIcon: React.FunctionComponent<{
  button: "primary" | "secondary";
}> = ({ button }) => {
  return (
    <div className="nux-icon flex items-center justify-center">
      <img src={getClickIcon(button)} className="h-3 w-3 filter-image-stroke" />
    </div>
  );
};

export const NUXIcon: React.FunctionComponent<
  PropsWithChildren<{ url?: string }>
> = ({ url, children }) => {
  return (
    <div className="nux-icon">
      {url && <img src={url} />}
      {children}
    </div>
  );
};

export const NUXItemIcon: React.FunctionComponent<{ itemId: BiomesId }> = ({
  itemId,
}) => {
  return (
    <NUXIcon>
      <ItemIcon item={anItem(itemId)} />
    </NUXIcon>
  );
};

export const NUXOpenInventoryItem: React.FunctionComponent<{
  nuxId: NUXES;
}> = ({ nuxId }) => {
  return (
    <NUXItem nuxId={nuxId}>
      <NUXLeft>
        <ShortcutText shortcut="E" keyCode="KeyE" />
      </NUXLeft>
      Press <NuxHotkey>E</NuxHotkey> to open your inventory
    </NUXItem>
  );
};

export const NUXItem: React.FunctionComponent<
  PropsWithChildren<{
    type?: "normal" | "timed";
    navigationAid?: NavigationAidSpec;
    nuxId: NUXES;
  }>
> = ({ type, navigationAid, nuxId, children }) => {
  const { mapManager, gardenHose } = useClientContext();
  useEffect(() => {
    if (navigationAid) {
      const bid = mapManager.addNavigationAid(navigationAid);
      return () => {
        mapManager.removeNavigationAid(bid);
      };
    }
  }, [navigationAid]);

  let leftContent: ReactChild | undefined;
  const extraChildren: ReactChild[] = [];

  React.Children.forEach(children, (child) => {
    switch ((child as ReactElement)?.type) {
      case NUXLeft:
        leftContent = child as ReactChild;
        break;
      default:
        extraChildren.push(child as ReactChild);
        break;
    }
  });

  useEffect(() => {
    if (type !== "timed") {
      return;
    }
    const t = setTimeout(() => {
      gardenHose.publish({
        kind: "nux_advance",
        nuxId: nuxId,
      });
    }, TIMED_NUX_TIME_MS);

    return () => {
      clearTimeout(t);
    };
  }, []);

  let timedBar: Variants = {};

  if (type === "timed") {
    timedBar = {
      initial: { width: "0%" },
      animate: {
        width: "100%",
        transition: { duration: TIMED_NUX_TIME_MS / 1000, ease: "linear" },
      },
      exit: { width: "0%", transition: { duration: 0 } },
    };
  }

  return (
    <>
      {type === "timed" && timedBar && (
        <motion.div variants={timedBar} className="timed-bg-bar" />
      )}
      <div className="nux-content">
        <div className="nux-left">{leftContent}</div>
        <div className="nux-text">{extraChildren}</div>
      </div>
    </>
  );
};

export const NuxHotkey: React.FunctionComponent<PropsWithChildren<{}>> = ({
  ...props
}) => {
  return (
    <motion.span
      initial={{ color: "var(--yellow)" }}
      animate={{ color: "var(--yellow)" }}
      exit={{ color: "var(--light-green)" }}
    >
      {props.children}
    </motion.span>
  );
};

export const FollowAidNUXItem: React.FunctionComponent<
  PropsWithChildren<{ aid: NavigationAidSpec; name: string; nuxId: NUXES }>
> = ({ aid, name, nuxId }) => {
  return (
    <NUXItem navigationAid={aid} nuxId={nuxId}>
      Follow the quest marker on your minimap to <NuxHotkey>{name}</NuxHotkey>
    </NUXItem>
  );
};

// Little hack to suppress states from being rendered
export const NO_RENDER_STATES: { [K in NUXES]?: NUXStates<K>[] } = {
  [NUXES.ENTER_WATER]: ["enter_water_waiting_second"],
};

const MovementNUX: React.FunctionComponent<{
  stateId: NUXStates<NUXES.MOVEMENT>;
}> = ({ stateId }) => {
  const nuxId = NUXES.MOVEMENT;
  useEffect(() => reportFunnelStage("walkNux"), []);
  switch (stateId) {
    case "movement_wasd":
      return (
        <NUXItem nuxId={nuxId}>
          <NUXLeft>
            <div className="nux-wasd">
              <ShortcutText shortcut="W" />
              <div className="asd">
                <ShortcutText shortcut="A" />
                <ShortcutText shortcut="S" />
                <ShortcutText shortcut="D" />
              </div>
            </div>
          </NUXLeft>
          Press the <NuxHotkey>WASD</NuxHotkey> keys to move
        </NUXItem>
      );
    case "movement_jump":
      return (
        <NUXItem nuxId={nuxId}>
          <NUXLeft>
            <ShortcutText
              shortcut="&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Space&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
              keyCode="Space"
              extraClassName="key-hint-space"
            />
          </NUXLeft>
          Press <NuxHotkey>Space</NuxHotkey> to jump
        </NUXItem>
      );
    case "movement_run":
      return (
        <NUXItem nuxId={nuxId}>
          <NUXLeft>
            <ShortcutText
              shortcut="&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Shift&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
              keyCode="ShiftLeft"
              extraClassName="key-hint-shift"
            />
          </NUXLeft>
          Hold <NuxHotkey>Shift</NuxHotkey> while moving to run
        </NUXItem>
      );
    case "movement_talk_to_jackie":
      return (
        <NUXItem nuxId={nuxId}>
          <NUXLeft>
            <div className="flex">
              <img src={mainQuestMarkAccepted.src} />
            </div>
          </NUXLeft>
          Now, approach <NuxHotkey>Jackie</NuxHotkey> in the Grove
        </NUXItem>
      );

    case "movement_near_jackie":
      return (
        <NUXItem nuxId={nuxId}>
          <NUXLeft>
            <ShortcutText shortcut="F" />
          </NUXLeft>
          Press the <NuxHotkey>F</NuxHotkey> key while facing Jackie to talk
        </NUXItem>
      );
  }
  return null;
};

const IntroQuestsNUX: React.FunctionComponent<{
  stateId: NUXStates<NUXES.INTRO_QUESTS>;
}> = ({ stateId }) => {
  const nuxId = NUXES.INTRO_QUESTS;
  switch (stateId) {
    case "intro_quests_tracked":
      return (
        <NUXItem nuxId={nuxId} type="timed">
          Tracked <NuxHotkey>Quests</NuxHotkey> show above the minimap
        </NUXItem>
      );
    case "intro_quests_press_q":
      return (
        <NUXItem nuxId={nuxId}>
          <NUXLeft>
            <ShortcutText shortcut="Q" keyCode="KeyQ" />
          </NUXLeft>
          Press <NuxHotkey>Q</NuxHotkey> to view Quests on a map
        </NUXItem>
      );
  }

  return null;
};

const BreakBlocksNUX: React.FunctionComponent<{
  stateId: NUXStates<NUXES.BREAK_BLOCKS>;
}> = ({ stateId }) => {
  const nuxId = NUXES.BREAK_BLOCKS;
  switch (stateId) {
    case "break_blocks_break":
      return (
        <NUXItem nuxId={nuxId}>
          <NUXLeft>
            <NUXClickIcon button="secondary" />
          </NUXLeft>
          Hold{" "}
          <NuxHotkey>{startCase(getSecondaryClickButton())} Click</NuxHotkey> to
          break blocks
        </NUXItem>
      );
  }
  return null;
};

const PlaceBlocksNux: React.FunctionComponent<{
  stateId: NUXStates<NUXES.PLACE_BLOCKS>;
}> = ({ stateId }) => {
  const nuxId = NUXES.PLACE_BLOCKS;
  const { userId, reactResources } = useClientContext();
  const playerInventory = reactResources.use("/ecs/c/inventory", userId);
  const selection = reactResources.use("/hotbar/selection");
  switch (stateId) {
    case "place_blocks_select": {
      const placeableIdx = playerInventory?.hotbar.findIndex(
        (e) => e && e.item.isBlock
      );
      const hotBarSlot = (placeableIdx ?? -1) + 1;
      const item = playerInventory?.hotbar[placeableIdx ?? 0];
      const displayName = item?.item.displayName;

      return (
        <NUXItem nuxId={nuxId}>
          <NUXLeft>
            <ShortcutText shortcut={String(hotBarSlot)} />
          </NUXLeft>
          Press <NuxHotkey>{hotBarSlot}</NuxHotkey> to equip {displayName}
        </NUXItem>
      );
    }
    case "place_blocks_place":
      const displayName = selection?.item?.displayName;
      return (
        <NUXItem nuxId={nuxId}>
          <NUXLeft>
            <NUXClickIcon button="primary" />
          </NUXLeft>
          Press{" "}
          <NuxHotkey>{startCase(getPrimaryClickButton())} Click</NuxHotkey> to
          place {displayName}
        </NUXItem>
      );
  }
  return null;
};

const WearStuffNux: React.FunctionComponent<{
  stateId: NUXStates<NUXES.WEAR_STUFF>;
}> = ({ stateId }) => {
  const nuxId = NUXES.WEAR_STUFF;
  switch (stateId) {
    case "wear_stuff_wear_items":
      return (
        <NUXItem nuxId={nuxId}>
          <NuxHotkey>Double-click</NuxHotkey> your shirt and jeans to wear them
        </NUXItem>
      );
    case "wear_stuff_prompt_inventory":
      return <NUXOpenInventoryItem nuxId={nuxId} />;
  }

  return null;
};

const RunAndJumpNUX: React.FunctionComponent<{
  stateId: NUXStates<NUXES.RUN_AND_JUMP>;
}> = ({ stateId }) => {
  const nuxId = NUXES.RUN_AND_JUMP;
  switch (stateId) {
    case "run_and_jump_run":
      return (
        <NUXItem nuxId={nuxId}>
          <NUXLeft>
            <ShortcutText
              shortcut="&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Space&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
              keyCode="Space"
              extraClassName="key-hint-space"
            />
          </NUXLeft>
          To jump further, hold <NuxHotkey>Shift</NuxHotkey> to run while
          jumping
        </NUXItem>
      );
  }

  return null;
};

const EnterWaterNUX: React.FunctionComponent<{
  stateId: NUXStates<NUXES.ENTER_WATER>;
}> = ({ stateId }) => {
  const nuxId = NUXES.ENTER_WATER;
  switch (stateId) {
    case "enter_water_first_time":
    case "enter_water_second_time":
      return (
        <NUXItem nuxId={nuxId} type="timed">
          <NUXLeft>
            <ShortcutText shortcut="Space" keyCode="Space" />
          </NUXLeft>
          Press <NuxHotkey>Space</NuxHotkey> to swim
        </NUXItem>
      );
  }

  return null;
};

const TakeSelfieNUX: React.FunctionComponent<{
  stateId: NUXStates<NUXES.SELFIE_PHOTO>;
}> = ({ stateId }) => {
  const nuxId = NUXES.SELFIE_PHOTO;
  const { reactResources, userId } = useClientContext();
  const playerInventory = reactResources.use("/ecs/c/inventory", userId);
  const camIdx = playerInventory?.hotbar.findIndex(
    (e) => e && (e.item.cameraModes || e.item.action === "photo")
  );
  switch (stateId) {
    case "selfie_camera_equip":
      return (
        <NUXItem nuxId={nuxId}>
          <NUXLeft>
            <NUXItemIcon itemId={BikkieIds.camera} />
          </NUXLeft>
          {camIdx !== undefined && camIdx !== -1 ? (
            <>
              Press <NuxHotkey>{camIdx + 1}</NuxHotkey> to equip
            </>
          ) : (
            <>Equip</>
          )}{" "}
          your <NuxHotkey>B-01 Camera</NuxHotkey> to take photos
        </NUXItem>
      );
    case "selfie_camera_prompt":
      return (
        <NUXItem nuxId={nuxId}>
          <NUXLeft>
            <NUXItemIcon itemId={BikkieIds.camera} />
          </NUXLeft>
          Press <NuxHotkey>F</NuxHotkey> to flip your camera
        </NUXItem>
      );
    case "selfie_camera_click":
      return (
        <NUXItem nuxId={nuxId}>
          <NUXLeft>
            <NUXClickIcon button="primary" />
          </NUXLeft>
          Press{" "}
          <NuxHotkey>{startCase(getPrimaryClickButton())} Click</NuxHotkey> and
          say fuzzy pickles!
        </NUXItem>
      );
    case "selfie_camera_post":
      return (
        <NUXItem nuxId={nuxId}>
          Press post to share your award winning smile
        </NUXItem>
      );
  }
  return null;
};

const HandCraftWoodenAxeNUX: React.FunctionComponent<{
  stateId: NUXStates<NUXES.HANDCRAFT_BUSTER>;
}> = ({ stateId }) => {
  const nuxId = NUXES.HANDCRAFT_BUSTER;

  switch (stateId) {
    case "handcraft_buster_prompt":
      return (
        <NUXItem nuxId={nuxId}>
          <NUXLeft>
            <ShortcutText shortcut="R" keyCode="KeyR" />
          </NUXLeft>
          Press <NuxHotkey>R</NuxHotkey> to open Recipes and craft a Muck Buster
        </NUXItem>
      );
    case "handcraft_buster_crafting":
      return (
        <NUXItem nuxId={nuxId}>
          <NuxHotkey>Click</NuxHotkey> the Muck Buster recipe and craft it
        </NUXItem>
      );
  }
  return null;
};

export const NUXStateRender: React.FunctionComponent<{
  nuxId: NUXES;
  stateId: string;
}> = ({ nuxId, stateId }) => {
  switch (nuxId) {
    case NUXES.MOVEMENT:
      return <MovementNUX stateId={stateId as any} />;
    case NUXES.INTRO_QUESTS:
      return <IntroQuestsNUX stateId={stateId as any} />;
    case NUXES.BREAK_BLOCKS:
      return <BreakBlocksNUX stateId={stateId as any} />;
    case NUXES.PLACE_BLOCKS:
      return <PlaceBlocksNux stateId={stateId as any} />;
    case NUXES.WEAR_STUFF:
      return <WearStuffNux stateId={stateId as any} />;
    case NUXES.RUN_AND_JUMP:
      return <RunAndJumpNUX stateId={stateId as any} />;
    case NUXES.ENTER_WATER:
      return <EnterWaterNUX stateId={stateId as any} />;
    case NUXES.SELFIE_PHOTO:
      return <TakeSelfieNUX stateId={stateId as any} />;
    case NUXES.HANDCRAFT_BUSTER:
      return <HandCraftWoodenAxeNUX stateId={stateId as any} />;

    default:
      assertNever(nuxId);
  }

  return <></>;
};
