import {
  bootstrapGlobalConfig,
  updateGlobalConfig,
} from "@/server/shared/config";
import { waitForAuthReady } from "@/server/shared/gce";
import { bootstrapGlobalSecrets } from "@/server/shared/secrets";
import { nodeMessagePort } from "@/server/shared/zrpc/messageport";
import type { Closable } from "@/shared/closable";
import { log } from "@/shared/logging";
import {
  connectMetricsToParent,
  exposeMetricsToChild,
} from "@/shared/metrics/thread";
import { disableExperimentalWarnings } from "@/shared/node_warnings";
import type { TupleOf } from "@/shared/util/type_helpers";
import type {
  Client,
  RpcContext,
  ServiceDescription,
  ServiceImplementation,
  UntypedMethods,
  UntypedStreamingMethods,
} from "@/shared/zrpc/core";
import { makeMessagePortClient } from "@/shared/zrpc/messageport_client";
import { MessagePortZrpcServer } from "@/shared/zrpc/messageport_server";
import { ok } from "assert";
import dotenv from "dotenv";
import type { MessagePort as NodeMessagePort } from "node:worker_threads";
import {
  MessageChannel,
  Worker,
  isMainThread,
  workerData,
} from "node:worker_threads";

export interface WorkerArgs<T> {
  globalConfig: typeof CONFIG;
  configPort: NodeMessagePort;
  metricsPorts: [NodeMessagePort, NodeMessagePort];
  port: NodeMessagePort;
  extra: T;
}

export function createPorts<N extends number>(n: N) {
  const ports1: NodeMessagePort[] = [];
  const ports2: NodeMessagePort[] = [];
  for (let i = 0; i < n; ++i) {
    const channel = new MessageChannel();
    ports1.push(channel.port1);
    ports2.push(channel.port2);
  }
  return [ports1, ports2] as [
    TupleOf<NodeMessagePort, N>,
    TupleOf<NodeMessagePort, N>
  ];
}

export async function defineBiomesWorker<T>(
  filename: string,
  entrypoint: (port: NodeMessagePort, extra?: T) => Promise<void>
): Promise<(extra?: T) => [NodeMessagePort, Closable]> {
  if (!isMainThread) {
    const data = workerData as WorkerArgs<T>;

    // Parse .env file for server configuration.
    dotenv.config();
    disableExperimentalWarnings();

    // Locally update config changes on remote updates.
    bootstrapGlobalConfig(data.globalConfig);
    data.configPort.on("message", (update) => updateGlobalConfig(update));

    await waitForAuthReady();
    await bootstrapGlobalSecrets();

    // Connect
    connectMetricsToParent(...data.metricsPorts);

    entrypoint(data.port, data.extra).catch((error) =>
      log.warn("Worker error", { error })
    );
  }
  return (extra?: T) => {
    ok(isMainThread, "You cannot create a worker within a worker!");

    const [metricsPorts1, metricsPorts2] = createPorts(2);
    const metricsCloser = exposeMetricsToChild(...metricsPorts1);

    const configChannel = new MessageChannel();
    const onConfigChanged = () => {
      configChannel.port1.postMessage(CONFIG);
    };
    CONFIG_EVENTS.on("changed", onConfigChanged);

    const channel = new MessageChannel();
    new Worker(filename, {
      workerData: <WorkerArgs<T>>{
        globalConfig: CONFIG,
        metricsPorts: metricsPorts2,
        configPort: configChannel.port2,
        port: channel.port2,
        extra,
      },
      transferList: [...metricsPorts2, configChannel.port2, channel.port2],
    }).unref();
    return [
      channel.port1,
      {
        close: () => {
          metricsCloser.close();
          CONFIG_EVENTS.off("changed", onConfigChanged);
          for (const port of metricsPorts1) {
            port.close();
          }
          configChannel.port1.close();
          channel.port1.close();
        },
      },
    ];
  };
}

export async function defineBiomesServiceWorker<
  TExtra,
  TMethods extends UntypedMethods,
  TStreamingMethods extends UntypedStreamingMethods
>(
  filename: string,
  service: ServiceDescription<TMethods, TStreamingMethods>,
  entrypoint: (
    start: (
      implementation: ServiceImplementation<
        RpcContext,
        TMethods,
        TStreamingMethods
      >
    ) => void,
    extra?: TExtra
  ) => Promise<void>
): Promise<(extra?: TExtra) => Client<TMethods, TStreamingMethods>> {
  const makeWorkerFn = await defineBiomesWorker<TExtra>(
    filename,
    async (port, extra) => {
      const server = new MessagePortZrpcServer(nodeMessagePort(port));
      await entrypoint(
        (implementation) => server.install(service, implementation),
        extra
      );
      port.start();
    }
  );
  return (extra?: TExtra) => {
    log.info("Creating worker process", {
      filename,
      service: service.serviceName,
    });
    const [port, closer] = makeWorkerFn(extra);
    const client = makeMessagePortClient(service, nodeMessagePort(port));
    const originalClose = client.close;
    client.close = async () => {
      await originalClose.call(client);
      closer.close();
    };
    return client;
  };
}
