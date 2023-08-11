import type { PubSub, PubSubTopic } from "@/server/shared/pubsub/api";
import { RedisPubSub } from "@/server/shared/pubsub/redis";
import {
  ShimPubsub,
  createShimPubSubClient,
} from "@/server/shared/pubsub/shim";

type PubSubKind = "redis" | "shim";

function determinePubSubKind(): PubSubKind {
  if (process.env.PUBSUB_KIND) {
    return process.env.PUBSUB_KIND as PubSubKind;
  }
  if (process.env.NODE_ENV === "production") {
    return "redis";
  }
  return "shim";
}

export function createPubSub<T extends PubSubTopic>(topic: T): PubSub<T> {
  const kind = determinePubSubKind();
  switch (kind) {
    case "redis":
      return new RedisPubSub(topic);
    case "shim":
      return new ShimPubsub(createShimPubSubClient(), topic);
    default:
      throw new Error(`Unknown pubsub kind: ${kind}`);
  }
}
