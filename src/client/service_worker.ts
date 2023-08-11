import { initializeFirebaseIfNeeded } from "@/client/game/firebase";
import {
  decodePushPayload,
  handleBackgroundPush,
} from "@/client/util/push_notifications";
import { log } from "@/shared/logging";
import { fireAndForget } from "@/shared/util/async";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

// eslint-disable-next-line unused-imports/no-unused-vars
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: { revision: string | null; url: string };
};

// Hack to use next-pwa.
// eslint-disable-next-line unused-imports/no-unused-vars
const manifest = self.__WB_MANIFEST;

initializeFirebaseIfNeeded();

log.info("[background]: Listening for activity.");

onBackgroundMessage(getMessaging(), (payload) => {
  log.info("[background] got push message");
  const envelope = decodePushPayload(payload);
  if (!envelope) {
    log.warn("[background] could not decode push payload");
    return;
  }
  fireAndForget(handleBackgroundPush(self.registration, envelope));
});
