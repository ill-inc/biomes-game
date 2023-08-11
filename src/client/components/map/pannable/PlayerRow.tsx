import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { EntityProfilePic } from "@/client/components/social/EntityProfilePic";
import { CallbackUserAvatarLink } from "@/client/components/social/MiniPhoneUserLink";
import { DialogButton } from "@/client/components/system/DialogButton";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import type { ClientContextSubset } from "@/client/game/context";
import { warpToDestination } from "@/client/game/util/warping";
import { useInterval } from "@/client/util/intervals";
import { useCachedUserInfo } from "@/client/util/social_manager_hooks";
import { BikkieIds } from "@/shared/bikkie/ids";
import type { ReadonlyInventory } from "@/shared/ecs/gen/components";
import type { ReadonlyF64, ReadonlyOptionalF64 } from "@/shared/ecs/gen/types";
import { chargeRemaining } from "@/shared/game/expiration";
import { determineTakePattern } from "@/shared/game/inventory";
import { countOf, createBag } from "@/shared/game/items";
import type { BiomesId } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";
import { displayUsername, shortTimeString } from "@/shared/util/helpers";
import { clamp } from "lodash";
import React, { useState } from "react";

export function getHomestoneCharge(
  deps: ClientContextSubset<"reactResources">,
  inventory: ReadonlyInventory | undefined
): number {
  const clock = deps.reactResources.use("/clock");
  if (!inventory) {
    return 0;
  }

  const pat = determineTakePattern(
    { inventory },
    createBag(countOf(BikkieIds.homestone)),
    {
      respectPayload: false,
    }
  );

  if (!pat || pat.length == 0) {
    return 0;
  }

  const homestone = pat[0][1].item;
  const charge = chargeRemaining(homestone, clock.time) ?? 0;

  return charge;
}

export const RobotBatteryIcon: React.FunctionComponent<{
  expiresAt: ReadonlyOptionalF64;
  batteryCapacity: ReadonlyF64;
}> = ({ expiresAt, batteryCapacity }) => {
  const context = useClientContext();
  const { resources } = context;

  const clock = resources.get("/clock");
  const timeRemaining = expiresAt
    ? clamp(expiresAt - clock.time, 0, batteryCapacity)
    : 0;
  const percentRemaining = (timeRemaining / batteryCapacity) * 100;

  return (
    <div className="flex flex-row-reverse items-center gap-[1px] text-xs text-tertiary-gray">
      <div
        className={`relative flex h-0.4 w-[2px] items-center overflow-hidden rounded-r-sm bg-white/50`}
      />
      <div
        className={`relative flex h-1 w-2 items-center overflow-hidden rounded-[4px] p-[1px]`}
        style={{ border: "1px solid rgba(255,255,255,0.5)" }}
      >
        <div
          className={`h-full rounded-[2px] bg-white`}
          style={{ width: `${percentRemaining}%` }}
        />
      </div>
    </div>
  );
};

export const RobotBatteryIconNameOverlay: React.FunctionComponent<{
  expiresAt: number;
  tint: string;
  batteryCapacity: number;
}> = ({ expiresAt, tint, batteryCapacity }) => {
  const { resources } = useClientContext();

  const getTimeRemaining = () => {
    const clock = resources.get("/clock");
    return expiresAt ? clamp(expiresAt - clock.time, 0, batteryCapacity) : 0;
  };

  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());
  const [percentRemaining, setPercentRemaining] = useState(
    (getTimeRemaining() / batteryCapacity) * 100
  );

  useInterval(() => {
    const timeRemaining = getTimeRemaining();
    const percentRemaining = (timeRemaining / batteryCapacity) * 100;
    setPercentRemaining(percentRemaining);
    setTimeRemaining(timeRemaining);
  }, 1000);

  return (
    <div className="flex flex-row-reverse items-center gap-0.1">
      <div
        className={`relative flex h-0.8 w-0.2 items-center overflow-hidden rounded-r-[1vmin] bg-black`}
        style={{
          boxShadow: `0 0 0 0.2vmin rgb(0,0,0)`,
        }}
      />
      <div
        className={`relative flex h-[2vmin] w-4 items-center overflow-hidden rounded-[0.6vmin] bg-tooltip-bg`}
        style={{
          boxShadow: `0 0 0 0.2vmin rgb(0,0,0)`,
        }}
      >
        <div
          className="h-full"
          style={{
            width: `${percentRemaining}%`,
            background: tint,
            boxShadow: "inset 0 0 0 0.2vmin rgba(255,255,255,.5)",
          }}
        />
        <div className="absolute left-0.4 mt-[1px] flex items-center text-sm text-white mix-blend-exclusion text-shadow-[none]">
          {shortTimeString(timeRemaining)}
        </div>
      </div>
    </div>
  );
};

export const RobotRow: React.FunctionComponent<{
  robotId: BiomesId;
  onClick?: (robotId: BiomesId) => unknown;
  onDoubleClick?: (robotId: BiomesId) => unknown;
}> = React.memo(({ robotId, onClick, onDoubleClick }) => {
  const context = useClientContext();
  const { resources, reactResources, userId } = context;

  const inventory = reactResources.use("/ecs/c/inventory", userId);
  const homestoneCharge = getHomestoneCharge(context, inventory);
  const tooltipContent =
    homestoneCharge < 1
      ? `Homestone charging · ${homestoneCharge * 100}%`
      : undefined;

  const robotComponent = resources.get("/ecs/c/robot_component", robotId);
  const robotParams = reactResources.use("/robots/params", robotId);
  const robotName = reactResources.use("/ecs/c/label", robotId);

  return (
    <li
      key={robotId}
      onClick={() => {
        onClick?.(robotId);
      }}
      onDoubleClick={() => onDoubleClick?.(robotId)}
      className={`user`}
    >
      <EntityProfilePic entityId={robotId} />
      <div className="username flex gap-0.8">
        {robotName?.text ?? "Robot"}
        {robotParams !== undefined && (
          <RobotBatteryIcon
            expiresAt={robotComponent?.trigger_at}
            batteryCapacity={robotParams.battery.capacity}
          />
        )}
      </div>
      <div>
        <Tooltipped tooltip={tooltipContent}>
          <DialogButton
            size="small"
            disabled={homestoneCharge < 1}
            onClick={() => {
              reactResources.set("/game_modal", { kind: "empty" });
              fireAndForget(
                warpToDestination(context, { kind: "robot", robotId })
              );
            }}
          >
            Warp
          </DialogButton>
        </Tooltipped>
      </div>
    </li>
  );
});

export const PlayerRow: React.FunctionComponent<{
  id: BiomesId;
  onClick?: (user: UserInfoBundle) => unknown;
  onDoubleClick?: (user: UserInfoBundle) => unknown;
}> = React.memo(({ id, onClick, onDoubleClick }) => {
  const { socialManager, mapManager } = useClientContext();
  const playerBundle = useCachedUserInfo(socialManager, id);
  const [beam, setBeam] = mapManager.react.useTrackingPlayerStatus(id);
  if (!playerBundle) {
    return <></>;
  }

  return (
    <li
      key={id}
      onClick={() => {
        onClick?.(playerBundle);
      }}
      onDoubleClick={() => onDoubleClick?.(playerBundle)}
      className={`user ${beam ? "tracked" : ""} `}
    >
      <Tooltipped tooltip={beam ? "Untrack" : "Track"}>
        <CallbackUserAvatarLink
          user={playerBundle.user}
          onClick={() => {
            onClick?.(playerBundle);
            setBeam(!beam);
          }}
        />
      </Tooltipped>
      <div className="username">
        {displayUsername(playerBundle.user.username)}
      </div>
    </li>
  );
});
