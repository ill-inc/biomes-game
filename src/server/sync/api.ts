import { zBiomesId } from "@/shared/ids";
import { zservice } from "@/shared/zrpc/service";
import { z } from "zod";

export const zEvalRequest = z.object({
  user: zBiomesId.optional(),
  code: z.string(),
  timeoutMs: z.number(),
});

export type EvalRequest = z.infer<typeof zEvalRequest>;

export const zEvalResponse = z.object({
  results: z.array(
    z.object({
      clientId: z.string(),
      sessionId: z.string(),
      result: z.any(),
    })
  ),
});

export type EvalResponse = z.infer<typeof zEvalResponse>;

export type SingleEvalResponse = EvalResponse["results"][number];

export const zInternalSyncService = zservice("sync-internal").addRpc(
  "eval",
  zEvalRequest,
  zEvalResponse
);
