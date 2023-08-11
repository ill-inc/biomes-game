import type {
  DistributedNotifierKey,
  Notifier,
} from "@/server/shared/distributed_notifier/api";
import { RedisNotifier } from "@/server/shared/distributed_notifier/redis";
import {
  ShimNotifier,
  createShimClient,
} from "@/server/shared/distributed_notifier/shim";

type DistributedNotifierKind = "redis" | "shim";

function determineDistributedNotifierKind(): DistributedNotifierKind {
  if (process.env.DISTRIBUTED_NOTIFIER_KIND) {
    return process.env.DISTRIBUTED_NOTIFIER_KIND as DistributedNotifierKind;
  }
  if (process.env.NODE_ENV === "production") {
    return "redis";
  }
  return "shim";
}

export function createDistributedNotifier(
  key: DistributedNotifierKey
): Notifier {
  const kind = determineDistributedNotifierKind();
  switch (kind) {
    case "redis":
      return new RedisNotifier(key);
    case "shim":
      return new ShimNotifier(createShimClient(), key);
    default:
      throw new Error(`Unknown distributed notifier kind: ${kind}`);
  }
}
