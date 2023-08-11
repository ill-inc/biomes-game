import { getFirebaseAdminApp } from "@/server/shared/firebase";
import type { BDB } from "@/server/shared/storage";
import {
  findAllWebPushTokens,
  removeAllWebPushTokens,
} from "@/server/web/db/push";
import type { Envelope } from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { zrpcWebSerialize } from "@/shared/zrpc/serde";
import type { SendResponse } from "firebase-admin/lib/messaging/messaging-api";
import { zip } from "lodash";

export async function sendWebPushMessages(
  db: BDB,
  userId: BiomesId,
  mail: Envelope[]
) {
  if (mail.length === 0) {
    return;
  }
  const tokens = await findAllWebPushTokens(db, userId);
  if (tokens.length === 0) {
    return;
  }
  const messaging = getFirebaseAdminApp().messaging();
  const badTokens: string[] = [];
  await Promise.all(
    mail.map(async (envelope) => {
      const result = await messaging.sendMulticast({
        data: {
          e: zrpcWebSerialize(envelope),
        },
        tokens,
      });
      for (const [response, token] of zip(result.responses, tokens) as [
        SendResponse,
        string
      ][]) {
        if (response.success || !response.error) {
          continue;
        } else if (
          response.error.code === "messaging/registration-token-not-registered"
        ) {
          badTokens.push(token);
          continue;
        }
        log.warn("Failed to send push message", {
          userId,
          error: response.error.message,
        });
      }
    })
  );

  if (badTokens.length > 0) {
    await removeAllWebPushTokens(db, userId, badTokens);
  }
}
