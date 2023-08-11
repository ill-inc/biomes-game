import { QuestHUDSteps } from "@/client/components/challenges/QuestViews";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  questCategoryAccentColor,
  questCategoryToIconSource,
} from "@/client/components/map/helpers";
import type { MoreMenuItem } from "@/client/components/system/MoreMenu";
import { MoreMenu } from "@/client/components/system/MoreMenu";
import { ShadowedImage } from "@/client/components/system/ShadowedImage";
import type { QuestBundle } from "@/client/game/resources/challenges";
import { ResetChallengeEvent } from "@/shared/ecs/gen/events";
import { fireAndForget } from "@/shared/util/async";
import React, { useState } from "react";
import moreIcon from "/public/hud/icon-16-more.png";

export const MapLeftPaneQuestRow: React.FunctionComponent<{
  challenge: QuestBundle;
  onClick?: (bundle: QuestBundle) => unknown;
  onDoubleClick?: (bundle: QuestBundle) => unknown;
}> = ({ challenge, onClick, onDoubleClick }) => {
  const clientContext = useClientContext();
  const { mapManager } = clientContext;
  const [isTracked, setIsTracked] = mapManager.react.useTrackingQuestStatus(
    challenge.biscuit.id
  );

  const category = challenge.biscuit.questCategory;
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [clickPoint, setClickPoint] = useState<[number, number]>([0, 0]);

  const bg = category ? questCategoryAccentColor(category) : undefined;
  const moreItems: MoreMenuItem[] = [];
  if (!isTracked) {
    moreItems.push({
      label: "Track",
      onClick: () => {
        setIsTracked(true);
        setShowMoreMenu(false);
      },
    });
  }
  moreItems.push({
    label: "Leave Quest",
    onClick: () => {
      fireAndForget(
        (async () =>
          clientContext.events.publish(
            new ResetChallengeEvent({
              id: clientContext.userId,
              challenge_id: challenge.biscuit.id,
            })
          ))()
      );
      setShowMoreMenu(false);
    },
  });

  return (
    <li
      onClick={() => {
        onClick?.(challenge);
      }}
      onDoubleClick={() => onDoubleClick?.(challenge)}
      className="relative items-start py-0.6"
    >
      <ShadowedImage
        extraClassNames={`shrink-0 avatar-wrapper avatar ${bg}`}
        imgClassName="w-[75%] h-[75%]"
        accentColor={bg}
        src={questCategoryToIconSource(category)}
      />

      <div className="flex-grow">
        <div className="flex items-center gap-0.4">
          {challenge.biscuit.displayName ?? challenge.biscuit.name}
          {isTracked && (
            <div className="rounded-[0.6vmin] bg-white/10 px-0.6 py-0.2 text-xs text-white">
              Tracked
            </div>
          )}
        </div>
        {challenge.progress && (
          <QuestHUDSteps
            progress={challenge.progress}
            className="text-sm text-secondary-gray"
          />
        )}
      </div>

      <div className="flex shrink-0 items-center">
        <div
          className="p-0.6"
          onClick={(e) => {
            e.stopPropagation();
            setClickPoint([e.clientX, e.clientY]);
            setShowMoreMenu(true);
          }}
        >
          <img
            className="filter-drop-shadow w-2"
            style={{ filter: "var(--image-shadow)" }}
            src={moreIcon.src}
          />
        </div>
      </div>
      <MoreMenu
        items={moreItems}
        showing={showMoreMenu}
        setShowing={setShowMoreMenu}
        pos={clickPoint}
      />
    </li>
  );
};
