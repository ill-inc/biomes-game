import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useLatestAvailableComponents } from "@/client/components/hooks/client_hooks";
import type { InspectShortcut } from "@/client/components/overlays/inspected/CursorInspectionOverlayComponent";
import type { ClientContextSubset } from "@/client/game/context";
import type { PlaceableInspectOverlay } from "@/client/game/resources/overlays";
import { defaultMinigameName } from "@/client/game/util/minigames";
import { createOrJoinMinigame } from "@/client/game/util/warping";
import {
  useCachedLeaderboardGetAfter,
  useCachedUserInfo,
} from "@/client/util/social_manager_hooks";
import type { RequestLeaderboard } from "@/pages/api/social/leaderboard_nearby_values";
import { BikkieIds } from "@/shared/bikkie/ids";
import type {
  CreatedBy,
  ReadonlyMinigameComponent,
  ReadonlyMinigameInstance,
  ReadonlyPlayingMinigame,
} from "@/shared/ecs/gen/components";
import type { Item } from "@/shared/ecs/gen/types";
import { currencyBalance } from "@/shared/game/inventory";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";
import { formatCurrency } from "@/shared/util/view_helpers";
import { useEffect, useState } from "react";

export function useCanAffordMinigameEntry(
  minigameId: BiomesId
): [afford: boolean, price: bigint] {
  const { reactResources, userId } = useClientContext();
  const [minigameComponent, createdBy] = useLatestAvailableComponents(
    minigameId,
    "minigame_component",
    "created_by"
  );
  const inventory = reactResources.use("/ecs/c/inventory", userId);
  const entryPrice =
    createdBy?.id === userId
      ? 0n
      : BigInt(minigameComponent?.entry_price ?? 0n);
  const canAfford = Boolean(
    inventory && currencyBalance(inventory, BikkieIds.bling) >= entryPrice
  );

  return [canAfford, entryPrice];
}

export function useJoinShortcut(
  minigameId: BiomesId,
  verb = "Play",
  setError?: (error: any) => void
): InspectShortcut {
  const clientContext = useClientContext();
  const [joining, setJoining] = useState(false);

  const [canAfford, entryPrice] = useCanAffordMinigameEntry(minigameId);

  const priceStr = entryPrice
    ? ` for ${formatCurrency(BikkieIds.bling, entryPrice)} Bling`
    : "";

  return {
    title: joining ? "Joining... " : `${verb}${priceStr}`,
    disabled: !canAfford,
    onKeyDown: async () => {
      setJoining(true);
      try {
        await createOrJoinMinigame(clientContext, minigameId);
      } catch (error: any) {
        setError?.(error);
      } finally {
        setJoining(false);
      }
    },
  };
}

export function useTopScoreUser(minigameId: BiomesId) {
  const { socialManager } = useClientContext();
  const leaderboardQuery: RequestLeaderboard = {
    kind: "race_minigame_time",
    id: minigameId,
  };

  const topScores = useCachedLeaderboardGetAfter(
    socialManager,
    leaderboardQuery,
    "alltime",
    "ASC"
  );

  const topScoreUser = useCachedUserInfo(socialManager, topScores?.[0]?.id);

  return [topScores?.[0], topScoreUser] as const;
}

export function usePlayingMinigameInfo(
  minigameId: BiomesId,
  minigameInstanceId: BiomesId
) {
  const { reactResources, socialManager } = useClientContext();
  const [instance, minigame] = reactResources.useAll(
    ["/ecs/c/minigame_instance", minigameInstanceId],
    ["/ecs/entity", minigameId]
  );
  const author = useCachedUserInfo(socialManager, minigame?.created_by?.id);

  return { instance, minigame, author };
}

export function useActiveInstancesIds(minigameId?: BiomesId) {
  const { reactResources } = useClientContext();
  const minigame = reactResources.use(
    "/ecs/c/minigame_component",
    minigameId ?? INVALID_BIOMES_ID
  );

  return minigame?.active_instance_ids ?? new Set();
}

export function useRaceLeaderboard(minigameId?: BiomesId) {
  const { reactResources, socialManager, userId } = useClientContext();
  const minigame = reactResources.use(
    "/ecs/c/minigame_component",
    minigameId ?? INVALID_BIOMES_ID
  );

  const requestLeaderboard: RequestLeaderboard | undefined =
    minigame && minigameId
      ? {
          kind: "race_minigame_time",
          id: minigameId,
        }
      : undefined;

  const leaderboard = useCachedLeaderboardGetAfter(
    socialManager,
    requestLeaderboard,
    "alltime",
    "ASC"
  );

  useEffect(() => {
    if (requestLeaderboard) {
      socialManager.eagerInvalidateLeaderboard(userId, requestLeaderboard);
    }
  }, [requestLeaderboard?.id ?? 0, minigame?.stats_changed_at ?? 0]);

  return leaderboard;
}

export type MinigamePlaceableBundle = {
  overlay: PlaceableInspectOverlay;
  placeableId: BiomesId;
  minigameName: string;
  minigameId: BiomesId;
  minigameComponent: ReadonlyMinigameComponent;
  minigameCreatedBy?: CreatedBy;
  minigameCreator?: UserInfoBundle;
  userCurrentMinigame?: ReadonlyPlayingMinigame;
  userCurrentInstance?: ReadonlyMinigameInstance;
  userIsPlayingGame?: boolean;
};

export function isMinigamePlaceableItem(item: Item) {
  return item.isPlaceable && (item.compatibleMinigames?.size ?? 0) > 0;
}

export function useMinigamePlaceableBundle(
  overlay: PlaceableInspectOverlay
): MinigamePlaceableBundle | undefined {
  const { reactResources, socialManager, userId } = useClientContext();
  const [gameElement, playingMinigame] = reactResources.useAll(
    ["/ecs/c/minigame_element", overlay.entityId],
    ["/ecs/c/playing_minigame", userId]
  );
  const [minigameComponent, createdBy, label] = useLatestAvailableComponents(
    gameElement?.minigame_id,
    "minigame_component",
    "created_by",
    "label"
  );

  const [activeInstance] = useLatestAvailableComponents(
    playingMinigame?.minigame_instance_id,
    "minigame_instance"
  );

  const minigameCreator = useCachedUserInfo(socialManager, createdBy?.id);

  if (!gameElement || !minigameComponent) {
    return undefined;
  }

  return {
    overlay,
    minigameName:
      label?.text ?? defaultMinigameName(minigameComponent?.metadata.kind),
    placeableId: overlay.entityId,
    minigameId: gameElement.minigame_id,
    minigameComponent,
    minigameCreatedBy: createdBy ?? undefined,
    minigameCreator: minigameCreator ?? undefined,
    userCurrentMinigame: playingMinigame,
    userCurrentInstance: activeInstance ?? undefined,
    userIsPlayingGame: playingMinigame?.minigame_id === gameElement.minigame_id,
  };
}

export function defaultMinigameInspectShortcuts(
  deps: ClientContextSubset<"userId" | "authManager" | "reactResources">,
  bundle: MinigamePlaceableBundle
): InspectShortcut[] {
  const isCreator = bundle.minigameCreatedBy?.id === deps.userId;
  const isAdmin = deps.authManager.currentUser.hasSpecialRole("admin");
  const canConfigure = isCreator || isAdmin;
  const ret: InspectShortcut[] = [];

  if (canConfigure && !bundle.userIsPlayingGame) {
    ret.push({
      title: `Configure${isAdmin && !isCreator ? " (Admin)" : ""}`,
      onKeyDown: () => {
        deps.reactResources.set("/game_modal", {
          kind: "generic_miniphone",
          rootPayload: {
            type: "minigame_edit",
            minigameId: bundle.minigameId,
            placeableId: bundle.placeableId,
          },
        });
      },
    });
  }
  return ret;
}
