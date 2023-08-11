import { getSecret } from "@/server/shared/secrets";
import type { UntrustedApply } from "@/shared/api/sync";
import type { ChangeToApply, zChangeToApply } from "@/shared/api/transaction";
import { WrappedProposedChange } from "@/shared/ecs/zod";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { zrpcSerialize } from "@/shared/zrpc/serde";
import { crc32 } from "crc";
import * as jwt from "jsonwebtoken";
import type { z } from "zod";

const MAX_UNTRUSTED_APPLY_AGE_MS = 60 * 1000;

export interface UntrustedApplyTokenPayload {
  u: BiomesId; // User ID.
  v: number; // crc32 of the transactions.
  ts: number; // Timestamp
}

export function validateSignedApplyRequest(
  userId: BiomesId,
  request: UntrustedApply
): boolean {
  try {
    const result = jwt.verify(
      request.token,
      getSecret("untrusted-apply-token"),
      {
        algorithms: ["HS512"],
      }
    ) as UntrustedApplyTokenPayload;
    if (
      result.u === userId &&
      Date.now() - result.ts <= MAX_UNTRUSTED_APPLY_AGE_MS &&
      result.v === crc32(zrpcSerialize(request.transactions))
    ) {
      return true;
    }
    log.warn("Invalid signature for apply endpoint", {
      userId,
      token: request.token,
      result,
    });
  } catch (error) {
    log.warn("Failed to verify apply token", {
      userId,
      token: request.token,
      error,
    });
  }
  return false;
}

export function createSignedApplyRequest(
  userId: BiomesId,
  transactions: ChangeToApply[]
): UntrustedApply {
  const wrapped: Required<z.infer<typeof zChangeToApply>>[] = transactions.map(
    (t) => ({
      iffs: t.iffs ?? [],
      changes: t.changes?.map((c) => new WrappedProposedChange(c)) ?? [],
      events: t.events ?? [],
      catchups: t.catchups ?? [],
    })
  );
  return {
    token: jwt.sign(
      <UntrustedApplyTokenPayload>{
        u: userId,
        v: crc32(zrpcSerialize(wrapped)),
        ts: Date.now(),
      },
      getSecret("untrusted-apply-token"),
      {
        algorithm: "HS512",
      }
    ),
    transactions: wrapped,
  };
}

// Example Usage:
// Set your account to origin.
// See move_to_origin.ts / yarn script:move_to_origin
//
// const userId = await determineEmployeeUserId();
// const client = await createSyncClient(userId);
//
// const transactions: ChangeToApply[] = [
//   {
//      NOTE: IN OTHER EXAMPLES, YOU SHOULD SPECIFY 'iffs'
//      TO ENSURE YOU ARE NOT OVERWRITING SOMETHING.
//      changes: [new WrappedProposedChange({
//        kind: "update",
//        entity: {
//          id: userId,
//          position: { v: [0, 0, 0] },
//        },
//      })],
//   }
// ];
//
// const request = createSignedApplyRequest(userId, transactions);
// const response = await client.apply(request);
// console.log(response);
