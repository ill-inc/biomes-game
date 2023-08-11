import { BuffIcon } from "@/client/components/BuffsHUD";
import { HealthBarHUD } from "@/client/components/HealthBarHUD";
import { prettyFishLength } from "@/client/components/chat/CatchMessageView";
import { ProfanityFiltered } from "@/client/components/chat/ProfanityFiltered";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  useLatestAvailableComponents,
  useLatestAvailableEntity,
} from "@/client/components/hooks/client_hooks";
import { RobotBatteryIconNameOverlay } from "@/client/components/map/pannable/PlayerRow";
import { useAppliedOverlayPosition } from "@/client/components/overlays/projected/helpers";
import { TeamLabelForUser } from "@/client/components/social/TeamLabel";
import type { NameOverlay } from "@/client/game/resources/overlays";
import { useCachedUserInfo } from "@/client/util/social_manager_hooks";
import type { TextMessage } from "@/shared/chat/messages";
import type { Buff, MinigameType } from "@/shared/ecs/gen/types";
import { buffDescription, buffType } from "@/shared/game/buffs";
import type { BiomesId } from "@/shared/ids";
import { numberToHex } from "@/shared/math/colors";
import type { Variants } from "framer-motion";
import { AnimatePresence, motion } from "framer-motion";
import { isEqual } from "lodash";
import React, { useEffect, useRef, useState } from "react";

function nameExtraClassName(overlay: NameOverlay): string {
  if (overlay.entity.user_roles?.roles.has("employee")) {
    return "employee";
  }
  if (overlay.npcType?.behavior.questGiver || overlay.entity.quest_giver) {
    return "quest-giver";
  }
  return "";
}

export const TypingIndicator: React.FunctionComponent<{}> = () => {
  const containerAnimation: Variants = {
    animate: {
      opacity: 1,
      transition: {
        repeat: Infinity,
        staggerChildren: 0.1,
        duration: 0.3,
      },
    },
  };
  const dotAnimation: Variants = {
    animate: {
      y: [0, -8, 0],
      transition: { repeat: Infinity, repeatDelay: 1 },
    },
  };
  return (
    <motion.div
      animate="animate"
      variants={containerAnimation}
      className="typing-indicator-container"
    >
      {Array.from({ length: 3 }, (_, i) => (
        <motion.div
          variants={dotAnimation}
          className="typing-indicator-dot"
          key={`dot-${i}`}
        >
          ·
        </motion.div>
      ))}
    </motion.div>
  );
};

const NameEphemeralOverlayComponent: React.FunctionComponent<{
  entityId: BiomesId;
}> = React.memo(({ entityId }) => {
  const { userId, reactResources } = useClientContext();
  const emote = reactResources.use("/ecs/c/emote", entityId);
  const [ephemeralNotif, setEphemeralNotif] = useState<undefined | string>();
  const notifTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  useEffect(() => {
    if (
      userId !== entityId &&
      emote?.emote_type === "fishingShow" &&
      emote.rich_emote_components?.item_override
    ) {
      const item = emote.rich_emote_components.item_override;
      const name = item.displayName;
      const fishLength = item.fishLength ?? 0;
      setEphemeralNotif(`Caught a ${prettyFishLength(fishLength)} ${name}`);
    } else {
      setEphemeralNotif(undefined);
    }
  }, [emote?.emote_type]);

  useEffect(() => {
    if (notifTimeoutRef.current) {
      clearTimeout(notifTimeoutRef.current);
    }

    notifTimeoutRef.current = setTimeout(() => {
      setEphemeralNotif(undefined);
    }, 4000);
  }, [ephemeralNotif]);

  return (
    <AnimatePresence>
      {ephemeralNotif && (
        <motion.div
          initial={{ x: "-50%", opacity: 0, scale: 0.0 }}
          animate={{ x: "-50%", opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.0 }}
          className={`biomes-box ephemeral-notif`}
        >
          {ephemeralNotif}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

const BuffEphemeralOverlayComponent: React.FunctionComponent<{
  entityId: BiomesId;
}> = React.memo(({ entityId }) => {
  const { userId, reactResources } = useClientContext();
  const [buff, setBuff] = useState<undefined | Buff>();
  const buffs = reactResources.use("/player/applicable_buffs").buffs;

  useEffect(() => {
    if (userId !== entityId) {
      return;
    }
    const roundedTime = Math.round(reactResources.get("/clock").time);
    const buffStartingNow = buffs.find(
      (b) => b.start_time && Math.round(b.start_time) === roundedTime
    );
    if (buffStartingNow && buffStartingNow.item_id !== buff?.item_id) {
      setBuff(buffStartingNow);
    }
  }, [buffs]);

  return (
    <AnimatePresence>
      {buff && (
        <motion.div
          key={buff.start_time}
          initial={{ x: "-50%", scale: 0.9, opacity: 0 }}
          animate={{
            opacity: [1, 1, 0],
            scale: 1,
            y: -40,
            transition: {
              y: { duration: 5 },
              opacity: { duration: 5 },
            },
          }}
          onAnimationComplete={() => {
            setBuff(undefined);
          }}
          className={`buff-notif buff-${buffType(buff)}`}
        >
          <BuffIcon buff={buff} /> {buffDescription(buff.item_id)}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

const PlayingMinigameSection: React.FunctionComponent<{
  minigameId: BiomesId;
  minigameType: MinigameType;
}> = React.memo(({ minigameId, minigameType }) => {
  const { reactResources } = useClientContext();
  const label =
    reactResources.use("/ecs/c/label", minigameId)?.text ?? minigameType;
  if (!label) {
    return <></>;
  }

  return <div className="play-minigame-name">Playing {label}</div>;
});

export const NameOverlayComponent: React.FunctionComponent<{
  overlay: NameOverlay;
}> = React.memo(({ overlay }) => {
  const { resources, socialManager, reactResources, userId } =
    useClientContext();
  const positionedDiv = useRef<HTMLDivElement>(null);
  let isEmojiOnly = false;
  if (overlay.recentText) {
    const content = (overlay.recentText.message as TextMessage).content;
    isEmojiOnly = /^(\p{Extended_Pictographic})*$/u.test(content);
  }
  const targetUserInfo = useCachedUserInfo(
    socialManager,
    overlay.recentText?.to
  );
  const isLocalPlayer = overlay.entityId === userId;
  const [
    playingMinigame,
    userPlayingMinigame,
    ruleset,
    robotComponent,
    creator,
    idle,
  ] = reactResources.useAll(
    ["/ecs/c/playing_minigame", overlay.entityId],
    ["/ecs/c/playing_minigame", userId],
    ["/ruleset/current"],
    ["/ecs/c/robot_component", overlay.entityId],
    ["/ecs/c/created_by", overlay.entityId],
    ["/ecs/c/idle", overlay.entityId]
  );
  const robotParams = resources.get("/robots/params", overlay.entityId);
  let nameAugmentation = ruleset.nameAugmentation(overlay.entity);
  if (idle) {
    nameAugmentation = `${
      nameAugmentation ? `${nameAugmentation} - ` : ""
    } Idle`.trim();
  }

  useAppliedOverlayPosition(positionedDiv, overlay.key, isLocalPlayer);

  const teamPlayerId =
    robotComponent && creator ? creator.id : overlay.entityId;

  const [playerTeam] = useLatestAvailableComponents(
    teamPlayerId,
    "player_current_team"
  );
  const teamEntity = useLatestAvailableEntity(playerTeam?.team_id);
  let nameColor = "var(--white)";

  if (teamEntity?.team?.color) {
    nameColor = numberToHex(teamEntity.team.color);
  }

  return (
    <div
      className={`name-overlay ${isLocalPlayer ? "local-player" : ""}
      ${nameExtraClassName(overlay)}
      `}
      ref={positionedDiv}
      style={{
        willChange: "transform",
      }}
    >
      <AnimatePresence>
        {overlay.recentText && overlay.recentText.message && (
          <motion.div
            initial="hidden"
            animate={overlay.beginHide ? "hidden" : "visible"}
            variants={{
              hidden: { x: "-50%", y: "-20%", opacity: 0, scale: 0.5 },
              visible: { x: "-50%", opacity: 1, scale: 1 },
            }}
            className={`recent-text biomes-box
            ${overlay.beginHide ? "hidden" : ""}
            ${overlay.recentText?.spatial?.volume == "yell" ? "yell" : ""}
            ${overlay.recentText?.to ? "dm" : ""}
            ${isEmojiOnly ? "emoji" : ""}
            `}
          >
            {targetUserInfo && (
              <>
                {`To `}
                {targetUserInfo.user.username ?? targetUserInfo.user.id}
                {`: `}
                <br />
              </>
            )}
            <ProfanityFiltered>
              {overlay.recentText &&
                (overlay.recentText.message as TextMessage).content}
            </ProfanityFiltered>
          </motion.div>
        )}
      </AnimatePresence>
      <NameEphemeralOverlayComponent entityId={overlay.entityId} />
      <BuffEphemeralOverlayComponent entityId={overlay.entityId} />
      {!isLocalPlayer && (
        <>
          <div
            className="name-overlay-player-name"
            style={{ color: nameColor }}
          >
            {nameAugmentation && `[${nameAugmentation}] `}
            {overlay.name}
            <TeamLabelForUser userId={teamPlayerId} />
            {robotComponent?.trigger_at && robotParams && (
              <RobotBatteryIconNameOverlay
                tint={nameColor}
                expiresAt={robotComponent?.trigger_at}
                batteryCapacity={robotParams.battery.capacity}
              />
            )}
            <div className="typing-indicator-container">
              <AnimatePresence>
                {overlay.typing && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <TypingIndicator />
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
          {playingMinigame &&
            playingMinigame.minigame_instance_id !==
              userPlayingMinigame?.minigame_instance_id && (
              <PlayingMinigameSection
                minigameId={playingMinigame.minigame_id}
                minigameType={playingMinigame.minigame_type}
              />
            )}
          {overlay.health && (
            <div className="remote-health-bar-container">
              <HealthBarHUD health={overlay.health} />
            </div>
          )}
        </>
      )}
    </div>
  );
}, isEqual);
