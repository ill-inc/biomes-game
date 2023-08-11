import { BikkieIds } from "@/shared/bikkie/ids";
import type { ChatMessage } from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";
import { zEnvelope, zUnsendEnvelope } from "@/shared/chat/types";
import { stringToItemBag } from "@/shared/game/items_serde";
import { log } from "@/shared/logging";
import { anyMapValue } from "@/shared/util/collections";
import { fetchUserInfoBundle } from "@/shared/util/fetch_bundles";
import type { UnionValue } from "@/shared/util/type_helpers";
import { passNever } from "@/shared/util/type_helpers";
import { imageUrlForSize } from "@/shared/util/urls";
import { maybeFormatCurrency } from "@/shared/util/view_helpers";
import { zrpcWebDeserialize } from "@/shared/zrpc/serde";
import { ok } from "assert";
import type { MessagePayload } from "firebase/messaging";

interface PushRender {
  title: string;
  options?: NotificationOptions;
}

const DOCUMENT_TYPE_TO_NAME: Record<
  "post" | "environment_group" | "land",
  string
> = {
  post: "post",
  environment_group: "build",
  land: "land",
};

export async function getPushRender(
  envelope: Envelope
): Promise<PushRender | undefined> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const message = envelope.message as UnionValue<
    ChatMessage,
    "text" | (typeof CONFIG.activityMessagesToPush)[number]
  >;
  switch (message.kind) {
    case "text":
      {
        ok(envelope.from);
        if (!envelope.to) {
          return;
        }

        const user = await fetchUserInfoBundle(envelope.from);
        return {
          title: `${user.user.username} DM'ed '${message.content}'`,
          options: {
            icon: imageUrlForSize("thumbnail", user.user.profilePicImageUrls),
          },
        };
      }
      break;
    case "like":
      {
        ok(envelope.from);
        const user = await fetchUserInfoBundle(envelope.from);
        return {
          title: `${user.user.username} liked your ${
            DOCUMENT_TYPE_TO_NAME[message.documentType]
          }`,
          options: {
            icon: imageUrlForSize("thumbnail", user.user.profilePicImageUrls),
          },
        };
      }
      break;
    case "comment":
      ok(envelope.from);
      const user = await fetchUserInfoBundle(envelope.from);
      return {
        title: `${user.user.username} commented on your ${
          DOCUMENT_TYPE_TO_NAME[message.documentType]
        }`,
        options: {
          body: message.comment,
          icon: imageUrlForSize("thumbnail", user.user.profilePicImageUrls),
        },
      };
      break;
    case "follow": {
      ok(envelope.from);
      const user = await fetchUserInfoBundle(envelope.from);
      return {
        title: `${user.user.username} followed you`,
        options: {
          icon: imageUrlForSize("thumbnail", user.user.profilePicImageUrls),
        },
      };
      break;
    }
    case "tag":
      {
        ok(envelope.from);
        const user = await fetchUserInfoBundle(envelope.from);
        return {
          title: `${user.user.username} tagged your ${
            DOCUMENT_TYPE_TO_NAME[message.documentType]
          } in a photo`,
          options: {
            icon: imageUrlForSize("thumbnail", user.user.profilePicImageUrls),
          },
        };
      }
      break;
    case "enter_my_robot": {
      const user = await fetchUserInfoBundle(message.visitorId);
      return {
        title: `${user.user.username} visited your land`,
        options: {
          icon: imageUrlForSize("thumbnail", user.user.profilePicImageUrls),
        },
      };
    }
    case "robotVisitorMessage": {
      const user = await fetchUserInfoBundle(message.visitorId);
      return {
        title: `${user.user.username} sent you a message via your robot: ${message.message}`,
        options: {
          icon: imageUrlForSize("thumbnail", user.user.profilePicImageUrls),
        },
      };
    }
    case "robotExpired": {
      return {
        title: `Your robot just expired`,
        options: {},
      };
    }
    case "purchase": {
      const purchaser = await fetchUserInfoBundle(message.entityId);
      const bag = stringToItemBag(message.bag);
      const payment = stringToItemBag(message.payment);
      const heroItem = anyMapValue(bag);
      const paymentAmount = anyMapValue(payment);
      return {
        title: `${purchaser.user.username} just purchased your ${
          heroItem?.item.displayName ?? "item"
        } for
        ${maybeFormatCurrency(BikkieIds.bling, paymentAmount?.count, "locale")}
        Bling`,
        options: {
          icon: imageUrlForSize(
            "thumbnail",
            purchaser.user.profilePicImageUrls
          ),
        },
      };
    }
    case "minigame_royalty": {
      const joiner = await fetchUserInfoBundle(message.joinerId);
      const title = `{username} just joined your minigame and you earned ${maybeFormatCurrency(
        BikkieIds.bling,
        message.royalty,
        "locale"
      )} Bling`;
      return {
        title,
        options: {
          icon: imageUrlForSize("thumbnail", joiner.user.profilePicImageUrls),
        },
      };
    }
    case "invitedToTeam":
      const inviter = await fetchUserInfoBundle(message.entityId);
      return {
        title: `You were invited to join a team`,
        options: {
          icon: imageUrlForSize("thumbnail", inviter.user.profilePicImageUrls),
        },
      };
    case "joined_my_team":
      const joiner = await fetchUserInfoBundle(message.player);
      return {
        title: `${joiner.user.username} joined your team`,
        options: {
          icon: imageUrlForSize("thumbnail", joiner.user.profilePicImageUrls),
        },
      };
    case "requestedToJoinTeam":
      return {
        title: "Join request sent",
      };
    case "requestToJoinTeamAccepted":
      return {
        title: "Team join request accepted",
      };
    case "mailReceived":
      const sender = await fetchUserInfoBundle(message.sender);
      return {
        title: `${sender.user.username} left mail at your mailbox`,
        options: {
          icon: imageUrlForSize("thumbnail", sender.user.profilePicImageUrls),
        },
      };
    default:
      passNever(message);
  }

  return;
}

export function decodePushPayload(
  payload: MessagePayload
): Envelope | undefined {
  if (!payload?.data?.e) {
    log.warn("[push] Received activity without data", {
      payload,
    });
    return;
  }

  try {
    return zrpcWebDeserialize(payload.data.e, zEnvelope);
  } catch (error) {
    // TODO: hide notifications
    try {
      zrpcWebDeserialize(payload.data.e, zUnsendEnvelope);
      log.info("[push] Received unsend message, ignoring");
    } catch (error: any) {
      log.error("[push] Received activity message with invalid data", {
        payload,
        error,
      });
    }
    return;
  }
}

export async function handleBackgroundPush(
  registration: ServiceWorkerRegistration,
  envelope: Envelope
) {
  const pushRender = await getPushRender(envelope);
  if (!pushRender) {
    return;
  }

  await registration.showNotification(pushRender.title, pushRender.options);
}

export async function handleForegroundPush(envelope: Envelope) {
  const pushRender = await getPushRender(envelope);
  if (!pushRender) {
    return;
  }

  if (typeof Notification === "undefined") {
    return;
  }

  if (Notification.permission === "granted") {
    const notification = new Notification(pushRender.title, pushRender.options);

    // If it's okay let's create a notification
    notification.onclick = function (event) {
      event.preventDefault(); // prevent the browser from focusing the Notification's tab
      notification.close();
    };
  }
}
