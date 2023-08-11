import { LoadingProgress } from "@/client/components/system/LoadProgress";
import type { InitConfigOptions } from "@/client/game/client_config";
import type { LoadProgress } from "@/client/game/load_progress";
import { progressSummary } from "@/client/game/load_progress";
import type { BiomesId } from "@/shared/ids";
import { emptyChannelStats } from "@/shared/zrpc/core";
import dynamic from "next/dynamic";
import { useState } from "react";

const Game = dynamic(() => import("@/client/components/Game"), {
  ssr: false,
});

export default function DynamicGameAndLoader({
  userId,
  tipSeed,
  configOptions,
}: {
  userId: BiomesId;
  tipSeed: number;
  configOptions?: InitConfigOptions;
}) {
  const [loadProgress, setLoadProgress] = useState<LoadProgress | undefined>({
    startedLoading: false,
    earlyContextLoader: undefined,
    channelStats: emptyChannelStats(),
    bootstrapped: false,
    entitiesLoaded: 0,
    playerMeshLoaded: false,
    terrainMeshLoaded: false,
    sceneRendered: 0,
  });

  return (
    <>
      {loadProgress && progressSummary(loadProgress) !== "ready" && (
        <LoadingProgress progress={loadProgress} tipSeed={tipSeed} />
      )}
      <Game
        userId={userId}
        loadProgress={loadProgress}
        setLoadProgress={setLoadProgress}
        configOptions={configOptions}
      />
    </>
  );
}
