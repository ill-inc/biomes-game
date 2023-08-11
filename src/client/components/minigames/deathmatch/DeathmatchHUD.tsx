import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { ClockDurationEndTime } from "@/client/components/minigames/ClockDuration";
import { usePlayingMinigameInfo } from "@/client/components/minigames/helpers";
import { useCachedUserInfo } from "@/client/util/social_manager_hooks";
import type { ReadonlyPlayingMinigame } from "@/shared/ecs/gen/components";
import type {
  DeathMatchPlayerState,
  ReadonlyMinigameInstanceState,
} from "@/shared/ecs/gen/types";
import { mapMap } from "@/shared/util/collections";
import type { UnionValue } from "@/shared/util/type_helpers";
import { ok } from "assert";

const DeathMatchHUDRow: React.FunctionComponent<{
  playerState: DeathMatchPlayerState;
  showKD?: boolean;
}> = ({ playerState, showKD = false }) => {
  const { socialManager } = useClientContext();
  const user = useCachedUserInfo(socialManager, playerState.playerId);

  return (
    <>
      <div className="player">{user?.user.username ?? "A User"}</div>
      <div>{playerState.kills}</div>
      {showKD && (
        <>
          <div>{playerState.deaths}</div>
        </>
      )}
    </>
  );
};

const DeathMatchHUDTable: React.FunctionComponent<{
  state: UnionValue<ReadonlyMinigameInstanceState, "deathmatch">;
  showKD?: boolean;
}> = ({ state, showKD = false }) => {
  return (
    <div className={`deathgrid ${showKD ? "show-kd" : ""} `}>
      <div className="player">Players</div>
      <div>Pts</div>
      {showKD && (
        <>
          <div>D</div>
        </>
      )}
      {mapMap(state.player_states, (p) => (
        <DeathMatchHUDRow key={p.playerId} playerState={p} showKD={showKD} />
      ))}
    </div>
  );
};

const StateRender: React.FunctionComponent<{
  state: UnionValue<ReadonlyMinigameInstanceState, "deathmatch">;
}> = ({ state }) => {
  if (!state.instance_state) {
    return <>UNDEFINED STATE</>;
  }
  switch (state.instance_state.kind) {
    case "waiting_for_players":
      return (
        <div className="title-and-author">
          Deathmatch · waiting for players...
        </div>
      );
    case "play_countdown":
      return (
        <div className="title-and-author">
          Starting in{" "}
          <ClockDurationEndTime endTime={state.instance_state.round_start} />
        </div>
      );
    case "playing":
      return (
        <>
          <div className="title-and-author">
            <ClockDurationEndTime endTime={state.instance_state.round_end} />{" "}
            remaining
          </div>
          <DeathMatchHUDTable state={state} />
        </>
      );
    case "finished":
      return (
        <>
          <div className="title-and-author">Round over! Press ESC to exit</div>
          <DeathMatchHUDTable state={state} showKD />
        </>
      );
  }
};

export const DeathMatchHUD: React.FunctionComponent<{
  playingMinigame: ReadonlyPlayingMinigame;
}> = ({ playingMinigame }) => {
  const { instance } = usePlayingMinigameInfo(
    playingMinigame.minigame_id,
    playingMinigame.minigame_instance_id
  );

  if (!instance) {
    return <></>;
  }

  ok(instance?.state.kind === "deathmatch");

  return <StateRender state={instance.state} />;
};
