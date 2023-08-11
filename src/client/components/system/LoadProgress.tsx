import type { LoadProgress } from "@/client/game/load_progress";
import { progressSummary } from "@/client/game/load_progress";
import { reportClientError } from "@/client/util/request_helpers";
import LoadingContentPreview from "@/pages/new-loading";
import { choose } from "@/shared/util/helpers";
import * as _ from "lodash";
import { entriesIn } from "lodash";
import type { ReactNode } from "react";
import React, { useEffect, useMemo, useState } from "react";

function progressDetails(loadProgress: LoadProgress): string[] {
  if (!loadProgress.startedLoading) {
    return ["Downloading..."];
  }
  if (!loadProgress.earlyContextLoader) {
    return ["Waiting for early context."];
  }
  if (!loadProgress.earlyContextLoader.loaded) {
    return [
      "Loading early context:",
      ...Array.from(
        entriesIn(loadProgress.earlyContextLoader.timing),
        ([key, time]) => `${key}: ${time.toFixed(3)}ms`
      ),
    ];
  }
  return [
    `Connection to server: ${loadProgress.channelStats.status}`,
    `Messages received: ${loadProgress.channelStats.receivedMessages}`,
    `Bytes downloaded: ${prettyMb(loadProgress.channelStats.receivedBytes)}`,
    `Entities loaded: ${loadProgress.entitiesLoaded}`,
    `Player mesh loaded: ${loadProgress.playerMeshLoaded}`,
    `Terrain mesh loaded: ${loadProgress.terrainMeshLoaded}`,
    `Scene frames rendered: ${loadProgress.sceneRendered}`,
  ];
}

const MEGABYTE = 1024 * 1024;
function prettyMb(bytes: number) {
  return `${(bytes / MEGABYTE).toFixed(2)} MB`;
}

// Tracks whether or not the current load has been in the same state for a
// long time or not. This works by checking if the progress *details* have
// in a set amount of time..  So if the user is slowly downloading data, this
// indicator will not appear.
function loadStaleChecks(progress: LoadProgress) {
  const [previousProgress, setPreviousProgress] = useState(progress);
  if (!_.isEqual(progress, previousProgress)) {
    setPreviousProgress(progress);
  }
  const [progressStaleTimeout, setProgressStaleTimeout] = useState<
    ReturnType<typeof setTimeout> | undefined
  >();
  const [staleProgress, setStaleProgress] = useState<
    LoadProgress | undefined
  >();

  useEffect(() => {
    const TIME_UNTIL_STALE_SECONDS = 10;
    if (progressStaleTimeout) {
      clearTimeout(progressStaleTimeout);
    }
    const newTimeout = setTimeout(() => {
      setStaleProgress((p) => {
        if (!p) {
          reportClientError(
            "LongLoad",
            `Load screen stuck at "${progressSummary(
              previousProgress
            )}" for >= ${TIME_UNTIL_STALE_SECONDS}s.`,
            {
              staleProgress: previousProgress,
            }
          );
        }
        return previousProgress;
      });
    }, TIME_UNTIL_STALE_SECONDS * 1000);
    setProgressStaleTimeout(newTimeout);
    return () => clearTimeout(newTimeout);
  }, [previousProgress]);

  return staleProgress;
}

export const tips = [
  "Use a Pick when mining ores and stone or you'll be left with nothing but Cobblestone",
  "Press [ESC] for the game menu and to scroll through chat",
  "When chopping wood, don't forget to use an Axe",
  "To escape a deep cave or to get back home, use your Homestone",
  "When people warp to your photos you receive a share of their warping fee",
  "Press [R] to quickly open your Crafting window",
  "Complete quests to unlock secret recipes and special items",
  "Lost? Use [M] to bring up a map of the world",
  "Press [T] for first-person view",
];

export const MemoLoadingProgressContent: React.FunctionComponent<{
  tip: string;
  progress: LoadProgress;
  hasLoadingProblems: boolean;
  onReloadClicked?: () => void;
  onToggleDetails: () => void;
  showDetails: boolean;
  children?: ReactNode;
}> = React.memo(
  ({
    tip,
    progress,
    hasLoadingProblems,
    onReloadClicked,
    onToggleDetails,
    showDetails,
    children,
  }) => {
    const detailsMsgs = progressDetails(progress);
    const detailsElements = Array.from(detailsMsgs.keys(), (i) => (
      <p key={i}>{detailsMsgs[i]}</p>
    ));
    return (
      <LoadingContentPreview
        tip={`Tip: ${tip}`}
        loadProgress={progress}
        onToggleDetails={onToggleDetails}
      >
        <div className="loading-info">
          {hasLoadingProblems && (
            <p className="loading-problems">
              Loading is unexpectedly stalled...{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onReloadClicked?.();
                }}
              >
                Reloading may help
              </a>
            </p>
          )}
          {showDetails && <div>{detailsElements}</div>}
          {children}
        </div>
      </LoadingContentPreview>
    );
  }
);

export const LoadingProgress: React.FunctionComponent<{
  progress: LoadProgress;
  tipSeed: number;
}> = ({ progress, tipSeed }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [reloadClicked, setReloadClicked] = useState(false);
  const [onceHadProblems, setOnceHadProblems] = useState(false);
  const staleProgress = loadStaleChecks(progress);
  const currentlyStale = _.isEqual(staleProgress, progress);
  const randomTip = useMemo(() => choose(tips, tipSeed * tips.length), []);

  let summary = progressSummary(progress);
  let loadingProblems = currentlyStale || summary === "problems_connecting";
  if (!onceHadProblems && loadingProblems) {
    setOnceHadProblems(true);
  }

  if (summary === "connecting" && onceHadProblems) {
    // If we've previously had problems connecting during this loading flow,
    // and we find ourselves currently in a state where we're disconnected, then
    // treat this from here on out as if we're currently having problems
    // connecting.
    summary = "problems_connecting";
    loadingProblems = true;
  }

  if (reloadClicked) {
    return (
      <div className="loading-wrapper">
        <MemoLoadingProgressContent
          hasLoadingProblems={loadingProblems}
          progress={progress}
          showDetails={showDetails}
          tip={randomTip}
          onToggleDetails={() => setShowDetails((show) => !show)}
        >
          <div className="loading-status">
            <div className="loading-summary">Reloading...</div>
          </div>
        </MemoLoadingProgressContent>
      </div>
    );
  }

  const ready = summary === "ready";

  if (ready) {
    return <></>;
  }

  return (
    <div className="loading-wrapper">
      <MemoLoadingProgressContent
        hasLoadingProblems={loadingProblems}
        progress={progress}
        showDetails={showDetails}
        onReloadClicked={() => {
          setReloadClicked(true);
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }}
        tip={randomTip}
        onToggleDetails={() => setShowDetails((show) => !show)}
      />
    </div>
  );
};
