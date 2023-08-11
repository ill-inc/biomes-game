import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useCachedEntity } from "@/client/components/hooks/client_hooks";
import { useRaceLeaderboard } from "@/client/components/minigames/helpers";
import { MiniPhoneUserAvatarLink } from "@/client/components/social/MiniPhoneUserLink";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { useExistingMiniPhoneContext } from "@/client/components/system/mini_phone/MiniPhoneContext";
import { BarTitle } from "@/client/components/system/mini_phone/split_pane/BarTitle";
import { LeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { RightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import type { GenericMiniPhonePayload } from "@/client/components/system/types";
import { useCachedUserInfo } from "@/client/util/social_manager_hooks";
import { durationToClockFormat } from "@/client/util/text_helpers";
import type { ResetLeaderboardRequest } from "@/pages/api/minigames/reset_leaderboard";
import type { LeaderboardPosition } from "@/server/shared/world/api";
import type { BiomesId } from "@/shared/ids";
import { fireAndForget } from "@/shared/util/async";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { displayUsername } from "@/shared/util/helpers";
import React, { useCallback, useState } from "react";

import { DialogButton } from "@/client/components/system/DialogButton";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import iconTrash from "/public/hud/icon-16-trash.png";

const MinigameLeaderboardRow: React.FunctionComponent<{
  position: LeaderboardPosition;
  minigameId: BiomesId;
}> = ({ position, minigameId }) => {
  const context = useClientContext();
  const { authManager } = context;
  const isAdmin = authManager.currentUser.hasSpecialRole("admin");
  const { socialManager } = useClientContext();
  const { pushNavigationStack } =
    useExistingMiniPhoneContext<GenericMiniPhonePayload>();
  const user = useCachedUserInfo(socialManager, position.id);
  const [deleting, setDeleting] = useState(false);
  const [_error, setError] = useError();

  const deleteLeaderboardRow = useCallback(async () => {
    setDeleting(true);
    try {
      await jsonPost<void, ResetLeaderboardRequest>(
        "/api/minigames/reset_leaderboard",
        {
          minigameId: minigameId,
          result: position.id,
        }
      );
    } catch (error: any) {
      setError(error);
    } finally {
      setDeleting(false);
    }
  }, []);
  return (
    <li
      key={position.id}
      onClick={() => {
        pushNavigationStack({
          type: "profile",
          userId: position.id,
        });
      }}
    >
      <div className="position">{position.rank + 1}</div>
      {user && (
        <>
          <MiniPhoneUserAvatarLink user={user.user} />
          <div className="username">{displayUsername(user.user.username)}</div>
        </>
      )}

      <div className="flavor-text">
        {durationToClockFormat(1000 * position.value)}
      </div>

      <div className="pl-[1vmin]">
        {isAdmin && (
          <Tooltipped tooltip="Delete Row (Admin)">
            <DialogButton
              disabled={deleting}
              onClick={() => {
                void deleteLeaderboardRow();
              }}
              extraClassNames="btn-inline"
            >
              <img className="w-[1.25vmin]" src={iconTrash.src} />
            </DialogButton>
          </Tooltipped>
        )}
      </div>
    </li>
  );
};

export const MinigameLeaderboardRightPane: React.FunctionComponent<{
  minigameId: BiomesId;
}> = ({ minigameId }) => {
  const context = useClientContext();
  const { authManager, userId } = context;
  const isAdmin = authManager.currentUser.hasSpecialRole("admin");

  const minigame = useCachedEntity(minigameId);
  const isOwner = minigame?.created_by?.id === userId;
  const leaderboard = useRaceLeaderboard(minigameId);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useError();

  if (!minigame) {
    return <></>;
  }

  const resetLeaderboard = useCallback(async () => {
    setResetting(true);
    try {
      await jsonPost<void, ResetLeaderboardRequest>(
        "/api/minigames/reset_leaderboard",
        {
          minigameId: minigame.id,
        }
      );
    } catch (error: any) {
      setError(error);
    } finally {
      setResetting(false);
    }
  }, []);

  return (
    <>
      <MaybeError error={error} />
      <section className="leaderboard biomes-box">
        <div className="title-bar">
          <div className="flex-1"></div>
          <div className="title">{minigame?.label?.text} Leaderboard</div>
          {(isOwner || isAdmin) && (
            <div>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  fireAndForget(resetLeaderboard());
                }}
              >
                {resetting ? "Resetting" : "Reset"}
              </a>
            </div>
          )}
        </div>
        <ol className="w-full">
          <>
            {leaderboard && leaderboard?.length > 0 ? (
              <>
                {leaderboard?.map((e) => (
                  <MinigameLeaderboardRow
                    position={e}
                    key={e.id}
                    minigameId={minigame.id}
                  />
                ))}
              </>
            ) : (
              <li className="justify-center p-3">No scores yet</li>
            )}
          </>
        </ol>
      </section>
    </>
  );
};

export const MinigameLeaderboard: React.FunctionComponent<{
  minigameId: BiomesId;
}> = ({ minigameId }) => {
  const minigame = useCachedEntity(minigameId);

  if (!minigame) {
    return <></>;
  }

  return (
    <SplitPaneScreen>
      <ScreenTitleBar>
        <BarTitle>Leaderboard</BarTitle>
      </ScreenTitleBar>
      <LeftPane></LeftPane>
      <RightPane>
        <MinigameLeaderboardRightPane minigameId={minigame.id} />
      </RightPane>
    </SplitPaneScreen>
  );
};
