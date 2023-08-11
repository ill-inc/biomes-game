import { zApplyResult, zChangeToApply } from "@/shared/api/transaction";
import type { Delivery } from "@/shared/chat/types";
import { zDelivery } from "@/shared/chat/types";
import type { Change } from "@/shared/ecs/change";
import { SerializeForServer } from "@/shared/ecs/gen/json_serde";
import { zVec3f } from "@/shared/ecs/gen/types";
import { ChangeSerde } from "@/shared/ecs/serde";
import { zEncodedVersionMap } from "@/shared/ecs/version";
import { WrappedChange, zChange, zEvent } from "@/shared/ecs/zod";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import type { ZWebSocketClient } from "@/shared/zrpc/core";
import type { CustomSerializedType } from "@/shared/zrpc/custom_types";
import { makeZodType } from "@/shared/zrpc/custom_types";
import { zservice } from "@/shared/zrpc/service";
import { z } from "zod";

export type SyncChange = Change | BiomesId;

export class WrappedSyncChange
  implements CustomSerializedType<WrappedSyncChange>
{
  constructor(public readonly change: SyncChange) {}

  public prepareForZrpc() {
    if (typeof this.change === "number") {
      return this.change;
    }
    return ChangeSerde.serialize(SerializeForServer, this.change);
  }
}

export const zSyncChange = makeZodType((val: any) => {
  if (val instanceof WrappedSyncChange) {
    return val;
  } else if (val instanceof WrappedChange) {
    return new WrappedSyncChange(val.change);
  }
  if (typeof val !== "number") {
    val = ChangeSerde.deserialize(val);
  }
  return new WrappedSyncChange(val);
});

export interface InitialState {
  changes: Change[];
  deliveries: Delivery[];
}

export const zExportRequest = z.object({
  versionMap: zEncodedVersionMap.optional(),
  radius: z.number().optional(),
  overrideUserId: zBiomesId.optional(),
  overridePosition: zVec3f.optional(),
});

export type ExportRequest = z.infer<typeof zExportRequest>;

export const zSyncEcsDelta = zSyncChange.array();

export type SyncEcsDelta = z.infer<typeof zSyncEcsDelta>;

export const zExportDelta = z.object({
  secondsSinceEpoch: z.number().optional(),
  chat: z.array(zDelivery).optional(),
  ecs: zChange.array().optional(),
  complete: z.boolean().optional(),
});

export type ExportDelta = z.infer<typeof zExportDelta>;

export const zSyncShape = z.enum(["none", "sphere", "aabb", "occlusion"]);

export type SyncShape = z.infer<typeof zSyncShape>;

export const zSyncTarget = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("localUser"),
    userId: zBiomesId,
  }),
  z.object({
    kind: z.literal("position"),
    position: zVec3f,
  }),
  z.object({
    kind: z.literal("entity"),
    entityId: zBiomesId,
  }),
]);

export type SyncTarget = z.infer<typeof zSyncTarget>;

export const zSyncSubscribeRequest = z.object({
  bootstrapped: z.boolean().optional(),
  radius: z.number().optional(),
  versionMap: zEncodedVersionMap.optional(),
  compressedVersionMap: z.instanceof(Uint8Array),
  syncTarget: zSyncTarget,
});

export type SyncSubscribeRequest = z.infer<typeof zSyncSubscribeRequest>;

export const zSyncDelta = z.object({
  secondsSinceEpoch: z.number().optional(),
  chat: z.array(zDelivery).optional(),
  ecs: zSyncEcsDelta.optional(),
  // Indicator once the bootstrap point in the stream is crossed.
  bootstrapComplete: z.boolean().optional(),
  // Server build ID sent on initial sync.
  buildId: z.string().optional(),
  // Client side evals
  evals: z.array(z.tuple([z.string(), z.string()])).optional(),
});

export type SyncDelta = z.infer<typeof zSyncDelta>;

export const zUntrustedApply = z.object({
  token: z.string(),
  transactions: z.array(zChangeToApply),
});

export type UntrustedApply = z.infer<typeof zUntrustedApply>;

export const zCreatePlayerRequest = z.object({
  displayName: z.string().optional(),
});

export type CreatePlayerRequest = z.infer<typeof zCreatePlayerRequest>;

export const zSyncService = zservice("sync")
  .addRpc("takeSession", z.void(), zChange.optional())
  .addRpc("createPlayer", zCreatePlayerRequest, z.void())
  .addRpc("changeRadius", z.number(), z.void())
  .addRpc("keepAlive", z.number().optional(), z.void())
  .addRpc("publish", z.array(zEvent), z.string().optional().array())
  .addRpc("publishOneWay", z.array(zEvent), z.void(), {
    oneWay: true,
  })
  .addRpc("apply", zUntrustedApply, zApplyResult)
  .addRpc("returnEval", z.tuple([z.string(), z.any()]), z.void())
  .addStreamingRpc("export", zExportRequest, zExportDelta)
  .addStreamingRpc("subscribe", zSyncSubscribeRequest, zSyncDelta);

export type SyncClient = ZWebSocketClient<typeof zSyncService>;
