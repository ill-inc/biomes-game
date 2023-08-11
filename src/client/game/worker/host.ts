import type { EarlyClientContext } from "@/client/game/context";
import { zClientWorker } from "@/client/game/worker/api";
import { isInWorker, outWorkerMessagePort } from "@/client/game/worker/util";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { makeMessagePortClient } from "@/shared/zrpc/messageport_client";
import { ok } from "assert";
import "remote-web-worker"; // Apply patch to Worker to permit cross-origin.

export async function registerClientWorker<C extends EarlyClientContext>(
  loader: RegistryLoader<C>
) {
  const config = await loader.get("clientConfig");
  if (!config.useWorker) {
    return;
  }
  ok(!isInWorker(), "Cannot create a worker within a worker!");
  // Do not change the format of the below line, Webpack is pattern-matching
  // on this callsite to detect the worker. Also note, the use of ../worker
  // is required as otherwise it'll get the mime type of the file wrong.
  const worker = new Worker(
    new URL("../worker/client.worker.ts", import.meta.url)
  );
  worker.addEventListener("error", (event) => {
    log.error("Worker error", { event });
  });
  const client = makeMessagePortClient(
    zClientWorker,
    outWorkerMessagePort(worker)
  );
  const originalClose = client.close.bind(client);
  client.close = async () => {
    await originalClose();
    worker.terminate();
  };
  return client;
}
