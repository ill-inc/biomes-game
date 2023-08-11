import type { Firehose } from "@/server/shared/firehose/api";
import { InMemoryFirehose } from "@/server/shared/firehose/memory";
import { RedisFirehose } from "@/server/shared/firehose/redis";
import {
  RemoteFirehose,
  zRemoteFirehoseService,
} from "@/server/shared/firehose/remote";
import { HostPort } from "@/server/shared/ports";
import { connectToRedis } from "@/server/shared/redis/connection";
import { makeClient } from "@/server/shared/zrpc/client";
import { addRetriesForUnavailable } from "@/server/shared/zrpc/retries";
import type { RegistryLoader } from "@/shared/registry";
import { assertNever } from "@/shared/util/type_helpers";

export type FirehoseMode = "memory" | "shim" | "redis";

interface FirehoseContext {
  config: {
    firehoseMode: FirehoseMode;
  };
}

export async function registerFirehose<C extends FirehoseContext>(
  loader: RegistryLoader<C>
): Promise<Firehose> {
  const config = await loader.get("config");
  switch (config.firehoseMode) {
    case "memory":
      return new InMemoryFirehose();
    case "shim":
      return new RemoteFirehose(
        addRetriesForUnavailable(
          zRemoteFirehoseService,
          makeClient(zRemoteFirehoseService, HostPort.forShim().rpc)
        )
      );
    case "redis":
      return new RedisFirehose(await connectToRedis("firehose"));
  }
  assertNever(config.firehoseMode);
}
