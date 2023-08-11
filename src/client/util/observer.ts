import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { ClientIo } from "@/client/game/context_managers/client_io";
import { cleanListener } from "@/client/util/helpers";
import { observerUrlForSyncTarget } from "@/server/web/util/urls";
import type { SyncTarget } from "@/shared/api/sync";
import { useEffect } from "react";

export function useIsObserving() {
  const { reactResources } = useClientContext();
  const syncTarget = reactResources.use("/server/sync_target");
  return syncTarget.kind !== "localUser";
}

export function useHistoryObserverSwitches(io: ClientIo) {
  useEffect(
    () =>
      cleanListener(window, {
        popstate: (history) => {
          if (history.state?.syncTarget) {
            void io.swapSyncTarget(history.state.syncTarget);
          }
        },
      }),
    []
  );
}

export async function switchSyncTarget(io: ClientIo, newTarget: SyncTarget) {
  const oldTarget = io.syncTarget;
  if (oldTarget.kind === "localUser" && !history.state?.syncTarget) {
    history.replaceState({ syncTarget: oldTarget }, "", window.location.href);
  }
  await io.swapSyncTarget(newTarget);
  const url =
    newTarget.kind === "localUser" ? "/" : observerUrlForSyncTarget(newTarget);
  history.pushState({ syncTarget: newTarget }, "", url);
}
