import { LoginRelatedControllerContext } from "@/client/components/static_site/LoginRelatedControllerContext";
import { DialogButton } from "@/client/components/system/DialogButton";

import Head from "next/head";

import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useLatestAvailableComponents } from "@/client/components/hooks/client_hooks";
import { useTopScoreUser } from "@/client/components/minigames/helpers";
import { EntityLabel } from "@/client/components/social/EntityLabel";
import { PositionLabel } from "@/client/components/social/PositionLabel";
import { HeroButton } from "@/client/components/static_site/HeroButton";
import { LoginRelatedController } from "@/client/components/static_site/LoginRelatedController";
import { SplashHeader } from "@/client/components/static_site/SplashHeader";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import type { ObserverMode } from "@/client/game/util/observer";
import { warpToEntity, warpToPosition } from "@/client/game/util/warping";
import { trackConversion } from "@/client/util/ad_helpers";
import { cleanListener } from "@/client/util/helpers";
import { switchSyncTarget } from "@/client/util/observer";
import { useCachedUserInfo } from "@/client/util/social_manager_hooks";
import { durationToClockFormat } from "@/client/util/text_helpers";
import type {
  RandomRequest,
  RandomResponse,
} from "@/pages/api/observer/random";
import type { SyncTarget } from "@/shared/api/sync";
import { reportFunnelStage } from "@/shared/funnel";
import { jsonFetch } from "@/shared/util/fetch_helpers";
import { pathWithQuery } from "@/shared/util/helpers";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const buttonClassNames = "flex-shrink whitespace-nowrap";

const AlreadyLoggedInUpsellSection: React.FunctionComponent<{
  switchToLocalPlayer: () => unknown;
}> = ({ switchToLocalPlayer }) => {
  const clientContext = useClientContext();
  const isAdmin = clientContext.authManager.currentUser.hasSpecialRole("admin");
  const syncTarget = clientContext.reactResources.use("/server/sync_target");

  const warpHere = useCallback(async () => {
    if (syncTarget.kind === "position") {
      await warpToPosition(clientContext, syncTarget.position);
    } else if (syncTarget.kind === "entity") {
      await warpToEntity(clientContext, syncTarget.entityId);
    }
    await switchToLocalPlayer();
  }, [switchToLocalPlayer, syncTarget]);
  return (
    <>
      {isAdmin && (
        <HeroButton
          extraClassNames={buttonClassNames}
          onClick={warpHere}
          label="Warp (Admin)"
        />
      )}

      <HeroButton
        extraClassNames={`${buttonClassNames} bg-magenta`}
        onClick={switchToLocalPlayer}
        label={"Back to Game"}
      />
    </>
  );
};

const TrueAnonymousUpsellSection: React.FunctionComponent<{
  onLoginClick: () => unknown;
}> = ({ onLoginClick }) => {
  return (
    <HeroButton
      extraClassNames={`${buttonClassNames} bg-magenta w-auto shrink`}
      label={"Login to Play"}
      onClick={() => {
        trackConversion("clickPlay");
        reportFunnelStage("playNowButton", {
          extra: {
            pageType: "observer",
            cta: "login",
          },
        });
        onLoginClick();
      }}
    />
  );
};

const ObserverText: React.FunctionComponent<{
  observerMode?: ObserverMode;
}> = ({ observerMode }) => {
  const { reactResources, socialManager } = useClientContext();
  const syncTarget = reactResources.use("/server/sync_target");

  let label: ReactNode | undefined = undefined;
  let subtitle: ReactNode | undefined = undefined;

  if (observerMode?.kind === "minigame") {
    const [minigameComponent, minigameLabel, minigameCreator] =
      useLatestAvailableComponents(
        observerMode.minigameId,
        "minigame_component",
        "label",
        "created_by"
      );

    const creator = useCachedUserInfo(socialManager, minigameCreator?.id);

    const minigameCTA =
      minigameLabel?.text ?? minigameComponent?.metadata?.kind ?? "Minigame";
    const [topScoreValue, topScoreUser] = useTopScoreUser(
      observerMode.minigameId
    );
    label = <>{minigameCTA}</>;
    subtitle = (
      <>
        By {creator?.user.username}
        {topScoreValue && (
          <>
            {" "}
            · Best time:{" "}
            {durationToClockFormat(1000 * topScoreValue.value, false)}
            {" by "}
            {topScoreUser?.user.username}
          </>
        )}
      </>
    );
  } else {
    switch (syncTarget.kind) {
      case "entity":
        label = (
          <>
            Observing <EntityLabel entityId={syncTarget.entityId} />
          </>
        );
        break;
      case "position":
        label = (
          <>
            Observing <PositionLabel position={syncTarget.position} />{" "}
          </>
        );
        break;
      default:
        label = <>Observer Mode</>;
    }
  }

  return (
    <div className="flex flex-grow flex-col text-shadow-bordered">
      <div className="text-[24px] font-bold md:text-xxxl">{label}</div>
      {subtitle && <div className="text-[16px] md:text-med">{subtitle}</div>}
    </div>
  );
};

export const PersonPlaceThingSelector: React.FunctionComponent<{
  switching: boolean;
  onDesireSwitch: (kind?: RandomRequest["kind"]) => unknown;
}> = ({ switching, onDesireSwitch }) => {
  return (
    <div className="flex w-full gap-1">
      <DialogButton
        disabled={switching}
        onClick={() => {
          onDesireSwitch("player");
        }}
      >
        Person
      </DialogButton>
      <DialogButton
        disabled={switching}
        onClick={() => {
          onDesireSwitch("landmark");
        }}
      >
        Place
      </DialogButton>
      <DialogButton
        disabled={switching}
        onClick={() => {
          onDesireSwitch("npc");
        }}
      >
        Thing
      </DialogButton>
    </div>
  );
};

export const AnonUpsell: React.FunctionComponent<{}> = ({}) => {
  const { io, clientConfig, userId } = useClientContext();
  const [_switching, setSwitching] = useState(false);
  const [error, setError] = useError();
  const rotateIdx = useRef<number>(1);
  const hasManualSwitchRef = useRef<boolean>(false);

  const switchToTarget = useCallback(async (target: SyncTarget) => {
    try {
      setSwitching(true);
      await switchSyncTarget(io, target);
    } catch (error: any) {
      setError(error);
    } finally {
      setSwitching(false);
    }
  }, []);

  const switchToLocalPlayer = useCallback(async () => {
    await switchToTarget({
      kind: "localUser",
      userId,
    });
  }, []);

  const switchToRandomTarget = useCallback(
    async (kind?: RandomRequest["kind"]) => {
      try {
        setSwitching(true);
        const response = await jsonFetch<RandomResponse>(
          pathWithQuery("/api/observer/random", kind ? { kind } : {})
        );
        await switchSyncTarget(io, response.target);
      } catch (error: any) {
        setError(error);
      } finally {
        setSwitching(false);
      }
    },
    []
  );

  const _rotateOrSwitchToRandomTarget = useCallback(async () => {
    if (
      clientConfig.initialObserverMode?.kind !== "rotate" ||
      rotateIdx.current >= clientConfig.initialObserverMode.syncTargets.length
    ) {
      await switchToRandomTarget();
      return;
    }

    const newVal =
      clientConfig.initialObserverMode.syncTargets[rotateIdx.current];
    rotateIdx.current += 1;
    await switchToTarget(newVal);
  }, []);

  useEffect(() => {
    if (!history.state.syncTarget) {
      history.replaceState(
        { syncTarget: io.syncTarget },
        "",
        window.location.href
      );
    }

    return cleanListener(window, {
      popstate: (history) => {
        if (history.state?.syncTarget) {
          void io.swapSyncTarget(history.state.syncTarget);
        }
      },
    });
  }, []);

  const [minigameComponent, minigameLabel] =
    clientConfig.initialObserverMode?.kind === "minigame"
      ? useLatestAvailableComponents(
          clientConfig.initialObserverMode.minigameId,
          "minigame_component",
          "label"
        )
      : [undefined, undefined];

  const minigameCTA =
    minigameLabel?.text ?? minigameComponent?.metadata?.kind ?? "Minigame";

  return (
    <>
      <Head>
        <meta name="theme-color" content="black" />
      </Head>

      <LoginRelatedController
        onLogin={() => {
          if (clientConfig.initialObserverMode?.kind === "minigame") {
            // For minigames, start you in the game
            window.location.reload();
          } else {
            window.location.href = "/";
          }
        }}
        customTitle={minigameComponent ? `Play ${minigameCTA}` : undefined}
      >
        <LoginRelatedControllerContext.Consumer>
          {(loginRelatedControllerContext) => (
            <>
              <SplashHeader
                onLoginClick={() => {
                  hasManualSwitchRef.current = true;
                  loginRelatedControllerContext.showLogin();
                }}
              />

              {!loginRelatedControllerContext.showingModal && (
                <div className="absolute bottom-0 flex w-full items-center justify-between gap-1 p-[12px] text-l md:p-[4vmin]">
                  <MaybeError error={error} />

                  <>
                    <ObserverText
                      observerMode={clientConfig.initialObserverMode}
                    />

                    {userId ? (
                      <AlreadyLoggedInUpsellSection
                        switchToLocalPlayer={switchToLocalPlayer}
                      />
                    ) : (
                      <TrueAnonymousUpsellSection
                        onLoginClick={() => {
                          hasManualSwitchRef.current = true;
                          loginRelatedControllerContext.showLogin();
                        }}
                      />
                    )}
                  </>
                </div>
              )}
            </>
          )}
        </LoginRelatedControllerContext.Consumer>
      </LoginRelatedController>
    </>
  );
};
