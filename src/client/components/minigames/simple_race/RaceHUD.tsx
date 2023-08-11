import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { ClockDuration } from "@/client/components/minigames/ClockDuration";
import {
  usePlayingMinigameInfo,
  useTopScoreUser,
} from "@/client/components/minigames/helpers";
import { ShortcutText } from "@/client/components/system/ShortcutText";
import { durationToClockFormat } from "@/client/util/text_helpers";
import type { ReadonlyPlayingMinigame } from "@/shared/ecs/gen/components";
import { RestartSimpleRaceMinigameEvent } from "@/shared/ecs/gen/events";
import { fireAndForget } from "@/shared/util/async";

export const RaceHUD: React.FunctionComponent<{
  playingMinigame: ReadonlyPlayingMinigame;
}> = ({ playingMinigame }) => {
  const clientContext = useClientContext();
  const { events, userId } = clientContext;
  const { instance, minigame } = usePlayingMinigameInfo(
    playingMinigame.minigame_id,
    playingMinigame.minigame_instance_id
  );

  const [topScoreValue, topScoreUser] = useTopScoreUser(
    playingMinigame.minigame_id
  );

  if (
    !instance ||
    instance.state.kind !== "simple_race" ||
    minigame?.minigame_component?.metadata?.kind !== "simple_race"
  ) {
    return <></>;
  }

  return (
    <>
      <div className="metadata">
        <div className="title-and-author">
          <div className="flex items-center gap-1 text-white">
            {minigame?.label?.text ?? "Race"}
            <ShortcutText shortcut="Esc" keyCode="Escape">
              Leave
            </ShortcutText>{" "}
            <ShortcutText
              shortcut="P"
              keyCode="KeyP"
              onKeyDown={() => {
                fireAndForget(
                  events.publish(
                    new RestartSimpleRaceMinigameEvent({
                      id: userId,
                      minigame_id: playingMinigame.minigame_id,
                      minigame_instance_id:
                        playingMinigame.minigame_instance_id,
                    })
                  )
                );
              }}
            >
              Restart
            </ShortcutText>
          </div>
        </div>
      </div>
      {instance.state.player_state === "waiting" ? (
        <></>
      ) : (
        <>
          <div className="minigame-clock">
            <div>
              Your Time:
              <br />
              Best Time:
            </div>
            <div>
              <span className="yellow">
                <ClockDuration startTime={instance.state.started_at} />
              </span>
              <br />
              {topScoreUser && topScoreValue && (
                <>
                  {durationToClockFormat(1000 * topScoreValue.value)} by{" "}
                  {topScoreUser.user.username}
                </>
              )}
            </div>
          </div>
          {minigame.minigame_component.metadata.checkpoint_ids.size > 0 && (
            <div>
              {instance.state.reached_checkpoints.size}/
              {minigame.minigame_component.metadata.checkpoint_ids.size}{" "}
              Checkpoints Reached
            </div>
          )}
        </>
      )}
    </>
  );
};
