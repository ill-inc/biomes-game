import type { EarlyClientContext } from "@/client/game/context";
import type { AuthManager } from "@/client/game/context_managers/auth_manager";
import { initializeFirebaseIfNeeded } from "@/client/game/firebase";
import {
  decodePushPayload,
  handleForegroundPush,
} from "@/client/util/push_notifications";
import {
  getTypedStorageItem,
  setTypedStorageItem,
} from "@/client/util/typed_local_storage";
import type { RegisterPushRequest } from "@/pages/api/register_web_push_token";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { fireAndForget } from "@/shared/util/async";
import { jsonPost } from "@/shared/util/fetch_helpers";
import { EventEmitter } from "events";
import type { MessagePayload } from "firebase/messaging";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import type TypedEventEmitter from "typed-emitter";

export type PushEvents = {
  onMessage: (payload: MessagePayload) => void;
};

export class PushManager {
  static VAPID_KEY =
    "BNwxRyIkEcj7Yl35Y6yhmtW-OmVWKTM0Ck8ZLy8LlnDLybsYJ0_inp4ayLOh6QTWlICtgojlBJYUGs_BC4A1TcY";
  static SOFT_DECLINE_TIME_MS = 7 * 24 * 60 * 60 * 1000;
  static MIN_USER_CREATE_TIME_FOR_PUSH = 1 * 60 * 60 * 1000;

  emitter: TypedEventEmitter<PushEvents> =
    new EventEmitter() as TypedEventEmitter<PushEvents>;

  constructor(
    private readonly userId: BiomesId,
    private readonly authManager: AuthManager
  ) {}

  hotHandoff(old: PushManager) {
    this.emitter = old.emitter;
  }

  allowForegroundPush() {
    return false;
  }

  shouldPromptForPermission() {
    if (typeof Notification === "undefined" || !this.userId) {
      return false;
    }

    return (
      Date.now() - (this.authManager.currentUser.createMs ?? 0) >
        PushManager.MIN_USER_CREATE_TIME_FOR_PUSH &&
      Notification.permission === "default" &&
      Date.now() - (getTypedStorageItem("lastSoftDeclinePush") ?? 0) >
        PushManager.SOFT_DECLINE_TIME_MS
    );
  }

  shouldRegisterPermission() {
    if (typeof Notification === "undefined" || !this.userId) {
      return false;
    }

    return Notification.permission === "granted";
  }

  hardPermissionsStatus() {
    if (typeof Notification === "undefined" || !this.userId) {
      return "denied";
    }

    return Notification.permission;
  }

  setSoftDeclinePushPermissions() {
    setTypedStorageItem("lastSoftDeclinePush", Date.now());
  }

  async registerPushPermission() {
    initializeFirebaseIfNeeded();
    const messaging = getMessaging();
    const token = await getToken(messaging, {
      vapidKey: PushManager.VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register(
        "/sw.js",
        {
          scope: "/",
        }
      ),
    });

    onMessage(messaging, (payload) => {
      this.emitter.emit("onMessage", payload);
      // Notification handled in active tab (normally a service worker)
      const envelope = decodePushPayload(payload);
      if (!envelope) {
        log.warn("[foreground push] could not decode push payload");
        return;
      }

      if (this.allowForegroundPush()) {
        fireAndForget(handleForegroundPush(envelope));
      }
    });

    log.info(`Push token: ${token}`);

    try {
      await jsonPost<void, RegisterPushRequest>(
        "/api/register_web_push_token",
        {
          token,
        }
      );
    } catch (error: any) {
      log.error(`Error registering web push token: ${error}`);
      throw error;
    }
  }
}

export async function loadPushManager(
  loader: RegistryLoader<EarlyClientContext>
): Promise<PushManager> {
  return new PushManager(
    ...(await Promise.all([loader.get("userId"), loader.get("authManager")]))
  );
}
