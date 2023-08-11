import type { ClientContext } from "@/client/game/context";
import type { ClientResourcesBuilder } from "@/client/game/resources/types";
import type { SyncTarget } from "@/shared/api/sync";
import { makeDisposable } from "@/shared/disposable";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import type { WebSocketChannelStats, WsSocketStatus } from "@/shared/zrpc/core";

const CLIENT_BUILD_ID = process.env.BUILD_ID ?? "";

export type ServerJsResource = {
  outOfDate: boolean;
};

export type SocketStatusResource = {
  status: WsSocketStatus;
};

export async function addGameStatusResources(
  loader: RegistryLoader<ClientContext>,
  builder: ClientResourcesBuilder
) {
  builder.add(
    "/server/js",
    loader.provide(({ resources, io }) => {
      const isOutOfDate = () =>
        !!io.serverBuildId && CLIENT_BUILD_ID !== io.serverBuildId;
      const listener = () => {
        const newOutOfDate = isOutOfDate();
        if (newOutOfDate !== resources.get("/server/js").outOfDate) {
          resources.invalidate("/server/js");
        }
      };
      io.on("buildId", listener);
      return makeDisposable<ServerJsResource>(
        {
          outOfDate: isOutOfDate(),
        },
        () => io.off("buildId", listener)
      );
    })
  );

  builder.add(
    "/server/socket",
    loader.provide(({ resources, io }) => {
      const listener = (stats: WebSocketChannelStats) => {
        if (stats.status !== resources.get("/server/socket").status) {
          resources.invalidate("/server/socket");
        }
      };
      io.on("status", listener);
      log.debug(`Socket change: ${io.channelStats.status}`);
      return makeDisposable<SocketStatusResource>(
        {
          status: io.channelStats.status,
        },
        () => io.off("status", listener)
      );
    })
  );

  builder.add(
    "/server/sync_target",
    loader.provide(({ io, resources }) => {
      const listener = () => {
        if (io.syncTarget !== resources.get("/server/sync_target")) {
          resources.invalidate("/server/sync_target");
        }
      };
      io.on("changedSyncTarget", listener);
      return makeDisposable<SyncTarget>(
        {
          ...io.syncTarget,
        },
        () => io.off("changedSyncTarget", listener)
      );
    })
  );
}
