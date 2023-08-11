import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { usePointerLockManager } from "@/client/components/contexts/PointerLockContext";
import { useCachedEntity } from "@/client/components/hooks/client_hooks";
import { Img } from "@/client/components/system/Img";
import { MaybeError, useError } from "@/client/components/system/MaybeError";
import { Tooltipped } from "@/client/components/system/Tooltipped";
import type { ClientTable } from "@/client/game/game";
import type { ClientReactResources } from "@/client/game/resources/types";
import { warpToGroup, warpToPost } from "@/client/game/util/warping";
import {
  useCanWarpToDocument,
  usePlayerHasPermissionForAcl,
} from "@/client/util/permissions_manager_hooks";
import { BikkieIds } from "@/shared/bikkie/ids";
import { calculateWarpFee } from "@/shared/game/costs";
import { currencyBalance } from "@/shared/game/inventory";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type {
  FeedPostBundle,
  GroupDetailBundle,
  SocialDocumentType,
  WarpInfo,
} from "@/shared/types";
import { fireAndForget } from "@/shared/util/async";
import { formatCurrency } from "@/shared/util/view_helpers";
import type { PropsWithChildren } from "react";
import React, { useCallback, useMemo, useState } from "react";
import warpIconBordered from "/public/hud/icon-16-warp-bordered.png";
import warpIcon from "/public/hud/icon-32-warp.png";

function actionButtonClassName(disabled?: boolean) {
  let className = `action-button link like-button`;
  if (disabled) {
    className += " disabled";
  }
  return className;
}

async function fetchAndCalcWarpFee(
  reactResources: ClientReactResources,
  table: ClientTable,
  warpInfo: WarpInfo
) {
  const localPlayer = reactResources.get("/scene/local_player");
  switch (warpInfo.destination.kind) {
    case "coordinates":
      return calculateWarpFee(
        localPlayer.player.position,
        warpInfo.destination.coordinates
      );
    case "entity":
      const warpEntity = await table.oob.oobFetchSingle(
        warpInfo.destination.entityId
      );
      if (!warpEntity) {
        throw new Error("No warp entity found");
      }

      const dest = warpEntity.warpable?.warp_to ?? warpEntity.position?.v;
      if (!dest) {
        throw new Error("Bad destination!");
      }

      return calculateWarpFee(localPlayer.player.position, dest);
  }
}

function useWarpFee(
  reactResources: ClientReactResources,
  warpInfo: WarpInfo,
  setError: (error: any) => unknown
): { warpFee?: bigint; loading: boolean } {
  const localPlayer = reactResources.use("/scene/local_player");

  switch (warpInfo.destination.kind) {
    case "coordinates":
      return {
        warpFee: calculateWarpFee(
          localPlayer.player.position,
          warpInfo.destination.coordinates
        ),
        loading: false,
      };
      break;
    case "entity":
      const warpEntity = useCachedEntity(warpInfo.destination.entityId);
      if (!warpEntity) {
        return {
          loading: true,
        };
      }

      const dest = warpEntity.warpable?.warp_to ?? warpEntity.position?.v;
      if (!dest) {
        setError("Not warpable");
        return {
          loading: false,
        };
      }

      return {
        warpFee: calculateWarpFee(localPlayer.player.position, dest),
        loading: false,
      };
      break;
  }
}

function canAfford(
  reactResources: ClientReactResources,
  userId: BiomesId,
  cost: bigint
) {
  const inventory = reactResources.get("/ecs/c/inventory", userId);
  return inventory && currencyBalance(inventory, BikkieIds.bling) >= cost;
}

export const WarpTooltip: React.FunctionComponent<{
  warpInfo: WarpInfo;
}> = ({ warpInfo }) => {
  const { reactResources, userId } = useClientContext();
  const [error, setError] = useError();

  const inventory = reactResources.use("/ecs/c/inventory", userId);
  const hasWarpPermission = usePlayerHasPermissionForAcl("warp_from");

  const { warpFee, loading } = useWarpFee(reactResources, warpInfo, setError);

  const memoAfford = useMemo(
    () =>
      warpFee === undefined
        ? false
        : canAfford(reactResources, userId, warpFee),
    [reactResources.version("/ecs/c/inventory", userId), warpFee]
  );

  if (!inventory) {
    return <></>;
  }

  return (
    <>
      <div>Warp</div>
      <MaybeError error={error} />
      <div className="label">
        Fee:{" "}
        {loading ? (
          "Loading..."
        ) : (
          <span className={`fee ${memoAfford ? "" : "too-much"}`}>
            {warpFee === undefined
              ? "???"
              : formatCurrency(
                  BikkieIds.bling,
                  warpFee,
                  "full",
                  "hide_zeros"
                )}{" "}
            BLING
          </span>
        )}
      </div>
      {!hasWarpPermission && (
        <div className="too-much">No permission to warp</div>
      )}
      {!memoAfford && <div className="too-much">Insufficient funds</div>}
    </>
  );
};

export const WarpButton: React.FunctionComponent<
  PropsWithChildren<{
    buttonType: "inline-chat" | "action";
    documentType: SocialDocumentType;
    document: FeedPostBundle | GroupDetailBundle;
  }>
> = ({ buttonType, documentType, document, children }) => {
  const pointerLockManager = usePointerLockManager();
  const [warpButtonDisabled, setWarpButtonDisabled] = useState(false);
  const canWarp = useCanWarpToDocument(documentType, document);
  const clientContext = useClientContext();
  const { reactResources, table, userId } = clientContext;

  const doWarp = useCallback(async () => {
    setWarpButtonDisabled(true);
    try {
      const cost = await fetchAndCalcWarpFee(
        reactResources,
        table,
        document.warpInfo!
      );
      if (cost === undefined || !canAfford(reactResources, userId, cost)) {
        return;
      }
      switch (documentType) {
        case "post":
          fireAndForget(warpToPost(clientContext, document as FeedPostBundle));
          break;
        case "environment_group":
          fireAndForget(
            warpToGroup(clientContext, document as GroupDetailBundle)
          );
          break;
      }
      pointerLockManager.focusAndLock();
    } catch (error: any) {
      log.error(error);
    } finally {
      setWarpButtonDisabled(false);
    }
  }, []);

  let imagePayload: JSX.Element | undefined;
  switch (buttonType) {
    case "inline-chat":
      imagePayload = <Img className="warp" src={warpIconBordered.src} />;
      break;

    case "action":
      imagePayload = <Img className="warp" src={warpIcon.src} />;
      break;
  }

  const disabled = warpButtonDisabled || !canWarp;
  return (
    <Tooltipped
      tooltip={
        document.warpInfo ? (
          <WarpTooltip warpInfo={document.warpInfo} />
        ) : undefined
      }
    >
      <button
        className={actionButtonClassName(disabled)}
        onClick={(e) => {
          e.preventDefault();
          void doWarp();
        }}
        disabled={disabled}
      >
        {imagePayload}
        {children}
        {buttonType === "inline-chat" && <>Warp</>}
      </button>
    </Tooltipped>
  );
};
