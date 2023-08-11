import type { PubSub } from "@/server/shared/pubsub/api";
import { createPubSub } from "@/server/shared/pubsub/pubsub";

export type GaiaPubSub = PubSub<"gaia-hipri">;

export async function registerGaiaPubSub(): Promise<GaiaPubSub> {
  return createPubSub("gaia-hipri");
}
