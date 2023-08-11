import { AvatarView } from "@/client/components/chat/Links";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useCSS3DRefCallback } from "@/client/components/css3d/helpers";
import {
  useCachedEntity,
  useLatestAvailableComponents,
} from "@/client/components/hooks/client_hooks";
import type { MetagameGroup } from "@/client/components/metagame/helpers";
import { useMetagameLeaderboard } from "@/client/components/metagame/helpers";
import { useRaceLeaderboard } from "@/client/components/minigames/helpers";
import { durationToClockFormat } from "@/client/util/text_helpers";
import type { LeaderboardPosition } from "@/server/shared/world/api";
import { bikkieDerived, getBiscuit, getBiscuits } from "@/shared/bikkie/active";
import type { BiomesId } from "@/shared/ids";
import { squareVector } from "@/shared/math/linear";
import { relevantBiscuitForEntityId } from "@/shared/npc/bikkie";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";

const LeaderboardRow: React.FunctionComponent<{
  position: LeaderboardPosition;
  format?: "duration" | "number";
}> = ({ position, format }) => {
  format ??= "duration";
  const { userId, reactResources } = useClientContext();

  const [label, team] = useLatestAvailableComponents(
    position.id,
    "label",
    "team"
  );
  const localPlayerTeam = reactResources.use(
    "/ecs/c/player_current_team",
    userId
  )?.team_id;
  const isSelf = team
    ? localPlayerTeam === position.id
    : position.id === userId;

  const icon = team ? (
    team.icon
  ) : (
    <AvatarView
      userId={position.id}
      extraClassName="w-[24px] h-[24px] shadow-none"
    />
  );

  return (
    <li
      className={`flex flex-1 items-center gap-[8px] rounded-[8px] px-[40px] ${
        isSelf ? "bg-white/5" : ""
      }`}
    >
      <div className="position">{position.rank + 1}</div>
      {icon}
      <div className="flex-grow font-semibold">
        <>{label?.text}</>
      </div>
      <div>
        {format === "duration"
          ? durationToClockFormat(1000 * position.value)
          : position.value}
      </div>
    </li>
  );
};

export const CSS3DLeaderboardContainer: React.FunctionComponent<{
  entityId: BiomesId;
  leaderboard: (LeaderboardPosition | undefined)[] | undefined;
  title?: string;
}> = ({ entityId, leaderboard, title }) => {
  const { socialManager, reactResources } = useClientContext();
  const css3d = useCSS3DRefCallback(reactResources, entityId);
  return (
    <div ref={css3d} className="h-[400px] w-[400px] bg-black py-[40px]">
      {leaderboard && (
        <ol className="flex h-full flex-col">
          {title && (
            <li className="pb-[12px] text-center text-[18px] font-semibold">
              {title}
            </li>
          )}
          {leaderboard.length ? (
            <>
              {leaderboard?.map((e) => (
                <>{e && <LeaderboardRow position={e} key={e.id} />}</>
              ))}

              {Array.from(
                Array(
                  socialManager.cachedLeaderboardGetAfterLimit() -
                    leaderboard.length
                ).keys()
              ).map((e) => (
                <li className="flex-1" key={e} />
              ))}
            </>
          ) : (
            <li className="flex flex-grow items-center justify-center opacity-50">
              No scores yet
            </li>
          )}
        </ol>
      )}
    </div>
  );
};

type SmallLeaderboardStats = { title: string; subtitle?: string };

export const SmallLeaderboard: React.FunctionComponent<{
  entityId: BiomesId;
}> = ({ entityId }) => {
  const { reactResources } = useClientContext();
  const css3d = useCSS3DRefCallback(reactResources, entityId);
  const gameElement = reactResources.use("/ecs/c/minigame_element", entityId);
  const leaderboard = useRaceLeaderboard(gameElement?.minigame_id);
  const minigame = useCachedEntity(gameElement?.minigame_id);
  const [statsIndex, setStatsIndex] = useState(0);

  const stats: SmallLeaderboardStats[] = [];

  if (minigame) {
    stats.push({ title: minigame.label?.text ?? "Game" });
  } else {
    stats.push({ title: "No Game Found" });
  }

  if (leaderboard && leaderboard.length > 0) {
    stats.push({
      title: leaderboard[0].value.toString(),
      subtitle: "Top Score",
    });
  }

  //TODO: add your rank and your high score

  useEffect(() => {
    const counter = setInterval(() => {
      if (statsIndex >= stats.length - 1) {
        setStatsIndex(0);
      } else {
        setStatsIndex(statsIndex + 1);
      }
    }, 3000);

    return () => {
      clearInterval(counter);
    };
  }, [statsIndex]);

  return (
    <div
      ref={css3d}
      className="h-[100px] w-[100px] border bg-[rgb(113,70,51)] p-[10px]"
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`stat-${statsIndex}`}
          initial={{ y: "15%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-15%", opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="flex h-full flex-col items-center justify-center text-center"
        >
          {stats[statsIndex].title && (
            <div className="font-semibold">{stats[statsIndex].title}</div>
          )}
          {stats[statsIndex].subtitle && (
            <div className="text-xs">{stats[statsIndex].subtitle}</div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export const TextSign: React.FunctionComponent<{
  entityId: BiomesId;
}> = ({ entityId }) => {
  const { reactResources, resources } = useClientContext();
  const css3d = useCSS3DRefCallback(reactResources, entityId);
  const signComponent = reactResources.use("/ecs/c/text_sign", entityId);
  const signItem = relevantBiscuitForEntityId(resources, entityId);
  const boxSize =
    signItem?.punchthroughSize ?? signItem?.boxSize ?? squareVector;

  return (
    <div
      ref={css3d}
      className="p-[10px]"
      style={{
        height: `${boxSize[0] * 100}px`,
        width: `${boxSize[2] * 100}px`,
        backgroundColor:
          signItem?.textSignConfiguration?.background_color ?? "#000000",
      }}
    >
      <div
        className="flex h-full flex-col items-center justify-center text-center font-vt text-[13px]"
        style={{ textShadow: "0 -1px rgba(0,0,0,.2)" }}
      >
        {signComponent?.text.map((text, i) => (
          <div key={i}>{text}</div>
        ))}
      </div>
    </div>
  );
};

export const CSS3DMinigameLeaderboard: React.FunctionComponent<{
  entityId: BiomesId;
}> = React.memo(({ entityId }) => {
  const { reactResources } = useClientContext();
  const gameElement = reactResources.use("/ecs/c/minigame_element", entityId);
  const leaderboard = useRaceLeaderboard(gameElement?.minigame_id);
  const minigame = useCachedEntity(gameElement?.minigame_id);

  return (
    <CSS3DLeaderboardContainer
      title={minigame?.label?.text}
      leaderboard={leaderboard}
      entityId={entityId}
    />
  );
});

const enabledMetaquests = bikkieDerived("enabledMetaquests", () => {
  return getBiscuits("/metaquests").filter((metaquest) => metaquest.enabled);
});

export const CSS3DMetagameLeaderboard: React.FunctionComponent<{
  entityId: BiomesId;
  itemId: BiomesId;
  group: MetagameGroup;
}> = React.memo(({ entityId, group, itemId }) => {
  const metaquest = getBiscuit(itemId).metaquest ?? enabledMetaquests()[0]?.id;
  const leaderboard = useMetagameLeaderboard(metaquest, group);
  return (
    <CSS3DLeaderboardContainer leaderboard={leaderboard} entityId={entityId} />
  );
});
