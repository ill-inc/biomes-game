import { RedisFirehose } from "@/server/shared/firehose/redis";
import {
  RemoteFirehose,
  zRemoteFirehoseService,
} from "@/server/shared/firehose/remote";
import { getGitEmail } from "@/server/shared/git";
import { connectToRedis } from "@/server/shared/redis/connection";
import { scriptInit } from "@/server/shared/script_init";
import { makeClient } from "@/server/shared/zrpc/client";
import { log } from "@/shared/logging";
import { render } from "prettyjson";

export async function listenToFirehose(prod?: string) {
  const useProd = prod === "prod";
  await scriptInit();

  const controller = new AbortController();
  const gracefulShutdown = () => {
    log.warn("Shutting down subscription...");
    controller.abort();
    log.warn("Done!");
  };
  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);

  const firehose = useProd
    ? new RedisFirehose(await connectToRedis("firehose"))
    : new RemoteFirehose(makeClient(zRemoteFirehoseService, "127.0.0.1:3052"));

  log.warn("Starting subscription!");
  for await (const batch of firehose.events(
    `${await getGitEmail()}-cli`,
    10_000,
    controller.signal
  )) {
    log.info(render(batch));
  }
}

const [prod] = process.argv.slice(2);
listenToFirehose(prod);
