import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useCachedEntity } from "@/client/components/hooks/client_hooks";
import { ClockDurationEndTime } from "@/client/components/minigames/ClockDuration";
import { usePlayingMinigameInfo } from "@/client/components/minigames/helpers";
import { minigameName } from "@/client/game/util/minigames";
import { useCachedUserInfo } from "@/client/util/social_manager_hooks";
import type { ReadonlyPlayingMinigame } from "@/shared/ecs/gen/components";
import type {
  ReadonlyMinigameInstanceState,
  SpleefPlayerStats,
} from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import { mapMap } from "@/shared/util/collections";
import type { UnionValue } from "@/shared/util/type_helpers";
import { ok } from "assert";

const WinnerView: React.FunctionComponent<{
  userId: BiomesId;
}> = ({ userId }) => {
  const { socialManager } = useClientContext();
  const lastWinner = useCachedUserInfo(socialManager, userId);
  return <>{lastWinner?.user.username} wins!</>;
};

const SpleefHUDRow: React.FunctionComponent<{
  stats: SpleefPlayerStats;
  isAlive?: boolean;
  isIt?: boolean;
  showEndStats?: boolean;
}> = ({ stats, isAlive, isIt, showEndStats }) => {
  const { socialManager } = useClientContext();
  const user = useCachedUserInfo(socialManager, stats.playerId);

  return (
    <>
      <div className={`player ${isAlive || showEndStats ? "alive" : "out"}`}>
        {user?.user.username ?? "A User"}
      </div>

      {showEndStats ? (
        <div>{stats.rounds_won}</div>
      ) : (
        <div className={`player ${isAlive ? "alive" : "out"}`}>
          {isAlive !== undefined && <>{isAlive ? "Alive" : "Out"}</>}
          {isIt && "- IT"}
        </div>
      )}
    </>
  );
};

const SpleefHUDTable: React.FunctionComponent<{
  state: UnionValue<ReadonlyMinigameInstanceState, "spleef">;
}> = ({ state }) => {
  const showEndGameStats = state.instance_state.kind === "round_countdown";
  const isAlive = (e: BiomesId) =>
    state.instance_state.kind === "playing_round"
      ? state.instance_state.alive_round_players.has(e)
      : undefined;
  const isIt = (e: BiomesId) =>
    state.instance_state.kind === "playing_round"
      ? state.instance_state.tag_round_state?.it_player === e
      : undefined;
  return (
    <>
      <div className={`deathgrid`}>
        {mapMap(state.player_stats, (p) => (
          <SpleefHUDRow
            key={p.playerId}
            stats={p}
            isAlive={isAlive(p.playerId)}
            isIt={isIt(p.playerId)}
            showEndStats={showEndGameStats}
          />
        ))}
      </div>
    </>
  );
};

const StateRender: React.FunctionComponent<{
  activeMinigame: ReadonlyPlayingMinigame;
  state: UnionValue<ReadonlyMinigameInstanceState, "spleef">;
}> = ({ activeMinigame, state }) => {
  const minigame = useCachedEntity(activeMinigame.minigame_id);
  switch (state.instance_state?.kind) {
    case "waiting_for_players":
      return (
        <div className="center-hud">
          <div
            style={{
              position: "fixed",
              top: "25vh",
              left: "50vw",
              transform: "translate(-50%, -50%)",
              fontSize: "var(--font-size-xxxlarge)",
              width: "100%",
              textAlign: "center",
              color: "var(--white)",
              display: "flex",
              flexDirection: "column",
              gap: "1vmin",
              fontWeight: "600",
            }}
          >
            {minigame && minigameName(minigame)}
            <div style={{ fontSize: "var(--font-size-large" }}>
              Waiting for players...
            </div>
          </div>
        </div>
      );

    case "round_countdown":
      return (
        <div className="center-hud">
          <SpleefHUDTable state={state} />
          {state.instance_state.last_winner_id && (
            <div
              style={{
                position: "fixed",
                top: "25vh",
                left: "50vw",
                transform: "translate(-50%, -50%)",
                fontSize: "var(--font-size-xxxlarge)",
                width: "100%",
                textAlign: "center",
                color: "var(--white)",
                display: "flex",
                flexDirection: "column",
                gap: "1vmin",
                fontWeight: "600",
              }}
            >
              <WinnerView userId={state.instance_state.last_winner_id} />
              <div style={{ fontSize: "var(--font-size-large" }}>
                Next round in{" "}
                <ClockDurationEndTime
                  endTime={state.instance_state.round_start}
                />
              </div>
            </div>
          )}
        </div>
      );

    case "playing_round":
      return (
        <>
          <div className="title-and-author">
            Round #{state.round_number + 1}{" "}
            <ClockDurationEndTime
              endTime={state.instance_state.round_expires}
            />{" "}
            remaining
          </div>
          <SpleefHUDTable state={state} />
        </>
      );
  }
};

export const SpleefHUD: React.FunctionComponent<{
  playingMinigame: ReadonlyPlayingMinigame;
}> = ({ playingMinigame }) => {
  const { instance } = usePlayingMinigameInfo(
    playingMinigame.minigame_id,
    playingMinigame.minigame_instance_id
  );

  if (!instance) {
    return <></>;
  }

  ok(instance?.state.kind === "spleef");

  return (
    <StateRender activeMinigame={playingMinigame} state={instance.state} />
  );
};
