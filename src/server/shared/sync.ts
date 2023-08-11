import type { Endpoint } from "@/server/shared/k8";
import {
  connectToK8,
  getServiceEndpoints,
  isRunningOnKubernetes,
} from "@/server/shared/k8";
import { HostPort } from "@/server/shared/ports";
import { serializeError } from "serialize-error";

export async function findAllSyncServerEndpoints(): Promise<Endpoint[]> {
  if (isRunningOnKubernetes()) {
    const k8 = connectToK8();
    return getServiceEndpoints(k8, "sync");
  } else {
    const hp = HostPort.forSync();
    return [
      {
        name: hp.host,
        ip: hp.host,
        ports: [
          {
            name: "rpc",
            port: hp.rpcPort,
          },
        ],
      },
    ];
  }
}

export async function dumpAllSyncServers() {
  const syncServers = await findAllSyncServerEndpoints();
  return Promise.all(
    syncServers.map(async (syncServer) => {
      try {
        const res = await fetch(
          `http://${syncServer.ip}:${HostPort.forMetrics().port}/dump`
        );
        return {
          ...syncServer,
          dump: await res.json(),
        };
      } catch (e) {
        return {
          ...syncServer,
          dump: { error: serializeError(e) },
        };
      }
    })
  );
}
