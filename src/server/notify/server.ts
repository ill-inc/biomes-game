import type { NotificationsServerContext } from "@/server/notify/main";
import type { ChatApi } from "@/server/shared/chat/api";
import type {
  Firehose,
  IdempotentFirehoseEvent,
} from "@/server/shared/firehose/api";
import { getGitEmail } from "@/server/shared/git";
import type { WorldApi } from "@/server/shared/world/api";
import { BackgroundTaskController } from "@/shared/abort";
import type { ChatMessage } from "@/shared/chat/messages";
import { anItem } from "@/shared/game/item";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { RegistryLoader } from "@/shared/registry";
import { sleep } from "@/shared/util/async";
import { DefaultMap, MultiMap } from "@/shared/util/collections";
import { uniq } from "lodash";

async function createSubscriptionName() {
  if (process.env.NODE_ENV !== "production") {
    // When running locally use a user-specific subscription name.
    return `${await getGitEmail()}-notifications-server`;
  }
  return `notifications-server`;
}

export class NotificationsServer {
  private readonly controller = new BackgroundTaskController();

  constructor(
    private readonly chatApi: ChatApi,
    private readonly firehose: Firehose,
    private readonly worldApi: WorldApi
  ) {}

  async start() {
    this.controller.runInBackground("send-notifications", (signal) =>
      this.run(signal)
    );
  }

  private async run(signal: AbortSignal) {
    do {
      try {
        for await (const [events, ack] of this.firehose.events(
          await createSubscriptionName(),
          CONFIG.notificationsAckTtl,
          signal
        )) {
          await this.handleBatch(events);
          await ack();
          if (!(await sleep(CONFIG.notificationsBatchWindowMs, signal))) {
            break;
          }
        }
      } catch (error) {
        log.error("Error while listening to firehose.", { error });
      }
    } while (await sleep(CONFIG.notificationsRetryDelayMs, signal));
  }

  async stop() {
    await this.controller.abortAndWait();
  }

  private async handleBatch(events: ReadonlyArray<IdempotentFirehoseEvent>) {
    // Cached team-member lookup.
    const teamMembers = new DefaultMap<BiomesId, Promise<BiomesId[]>>(
      async (id: BiomesId) => {
        try {
          return Array.from(
            (await this.worldApi.get(id))?.team()?.members?.keys() ?? []
          );
        } catch (error) {
          log.warn("Failed to fetch team membership", { id });
          return [];
        }
      }
    );

    const eventsByEntity = new MultiMap<BiomesId, IdempotentFirehoseEvent>();
    for (const event of events) {
      eventsByEntity.add(event.entityId, event);
    }
    await Promise.all([
      ...eventsByEntity.map(async ([id, events]) => {
        try {
          await this.sendEventNotifications(id, events, teamMembers);
        } catch (error: any) {
          log.error(`Error while handling notifications ${id}`, { error });
          // Ignore the error.
        }
      }),
    ]);
  }

  private async sendEventNotifications(
    id: BiomesId,
    events: ReadonlyArray<IdempotentFirehoseEvent>,
    teamMembers: DefaultMap<BiomesId, Promise<BiomesId[]>>
  ) {
    const work: Promise<unknown>[] = [];
    const notifiedChallenges = new Set<BiomesId>();
    const notifiedRecipes = new Set<BiomesId>();

    const forwardFirehoseToActivity = (
      target: BiomesId,
      event: ChatMessage & IdempotentFirehoseEvent
    ) => {
      work.push(
        this.chatApi.sendMessage({
          id: `fh:${event.uniqueId}`,
          channel: "activity",
          to: target,
          message: {
            ...event,
          },
        })
      );
    };

    for (const event of events) {
      switch (event.kind) {
        case "purchase":
          {
            if (id === event.seller) {
              continue;
            }
            work.push(
              this.chatApi.sendMessage({
                id: `fh:${event.uniqueId}`,
                channel: "activity",
                to: event.seller,
                message: {
                  ...event,
                },
              })
            );
          }
          break;

        case "challengeUnlocked":
          {
            if (notifiedChallenges.has(event.challenge)) {
              continue;
            }
            work.push(
              this.chatApi.sendMessage({
                id: `fh:${event.uniqueId}`,
                channel: "activity",
                to: id,
                message: {
                  kind: "challenge_unlock",
                  challengeId: event.challenge,
                },
              })
            );
          }
          break;

        case "challengeCompleted":
          {
            if (notifiedChallenges.has(event.challenge)) {
              continue;
            }
            notifiedChallenges.add(event.challenge);
            work.push(
              this.chatApi.sendMessage({
                id: `fh:${event.uniqueId}`,
                channel: "activity",
                to: id,
                message: {
                  kind: "challenge_complete",
                  challengeId: event.challenge,
                },
              })
            );
          }
          break;

        case "recipeUnlocked":
          {
            if (notifiedRecipes.has(event.recipe.id)) {
              continue;
            }

            notifiedRecipes.add(event.recipe.id);
            work.push(
              this.chatApi.sendMessage({
                id: `fh:${event.uniqueId}`,
                channel: "activity",
                to: id,
                message: {
                  kind: "recipe_unlock",
                  recipe: event.recipe,
                },
              })
            );
          }
          break;

        case "minigame_simple_race_finish":
          forwardFirehoseToActivity(event.minigameCreatorId, event);
          break;
        case "invitedToTeam":
          forwardFirehoseToActivity(event.entityId, event);
          break;
        case "robotInventoryChanged":
          forwardFirehoseToActivity(event.entityId, event);
          break;
        case "robotExpired":
          forwardFirehoseToActivity(event.entityId, event);
          break;
        case "beginTrade":
          forwardFirehoseToActivity(event.entity2Id, event);
          break;
        case "joinedTeam":
          work.push(
            teamMembers.get(event.teamId).then((members) =>
              Promise.all(
                members.map((id) => {
                  if (id === event.entityId) {
                    return;
                  }
                  return this.chatApi.sendMessage({
                    id: `fh:${event.uniqueId}`,
                    channel: "activity",
                    to: id,
                    message: {
                      kind: "joined_my_team",
                      player: event.entityId,
                      teamId: event.teamId,
                    },
                  });
                })
              )
            )
          );
          break;
        case "requestedToJoinTeam":
          work.push(
            teamMembers
              .get(event.teamId)
              .then((members) =>
                Promise.all(
                  members.map((id) => forwardFirehoseToActivity(id, event))
                )
              )
          );
          break;
        case "requestToJoinTeamAccepted":
          forwardFirehoseToActivity(event.entityId, event);
          break;
        case "metaquestPoints":
          // Message everyone
          work.push(
            this.chatApi.sendMessage({
              id: `fh:${event.uniqueId}`,
              message: {
                kind: "metaquest_points",
                player: event.entityId,
                team: event.teamId,
                metaquest: event.metaquestId,
                points: event.points,
              },
            })
          );
          break;
        case "enterRobotField":
          // Rate limit this event
          const rateLimitingTimestamp = Math.floor(
            event.timestamp / (1000 * 60 * 60)
          );
          if (
            event.robotCreatorId !== event.entityId ||
            CONFIG.allowPushForSelfActivity
          ) {
            work.push(
              this.chatApi.sendMessage({
                id: `fh:${event.entityId}:${rateLimitingTimestamp}`,
                channel: "activity",
                to: event.robotCreatorId,
                message: {
                  kind: "enter_my_robot",
                  visitorId: event.entityId,
                },
              })
            );
          }
          break;
        case "craft":
          if (event.royaltyTo && event.royaltyAmount && event.stationEntityId) {
            work.push(
              this.chatApi.sendMessage({
                id: `fh:${event.uniqueId}`,
                channel: "activity",
                to: event.royaltyTo,
                message: {
                  kind: "crafting_station_royalty",
                  crafterId: event.entityId,
                  craftingStationId: event.stationEntityId,
                  royalty: event.royaltyAmount,
                },
              })
            );
          }
          break;
        case "joinedMinigameEvent":
          if (event.royaltyTo && event.royaltyAmount) {
            work.push(
              this.chatApi.sendMessage({
                id: `fh:${event.uniqueId}`,
                channel: "activity",
                to: event.royaltyTo,
                message: {
                  kind: "minigame_royalty",
                  joinerId: event.entityId,
                  minigameId: event.minigameId,
                  royalty: event.royaltyAmount,
                },
              })
            );
          }
          break;
        case "overflowedToInbox":
          forwardFirehoseToActivity(event.entityId, event);
          break;
        case "discovered":
          {
            for (const [type, contents] of event.contents) {
              if (!CONFIG.discoveryTypesToNotify.includes(type)) {
                continue;
              }
              const uniqueContents = uniq(contents.sort());
              const uniqueId = uniqueContents.join(";");
              work.push(
                this.chatApi.sendMessage({
                  id: `fh:${type}${uniqueId}`,
                  channel: "activity",
                  to: id,
                  message: {
                    kind: "discovery",
                    statsType: type,
                    items: uniqueContents.map((e) => anItem(e)),
                  },
                })
              );
            }
          }
          break;
        case "mailSent":
          forwardFirehoseToActivity(event.entityId, event);
          work.push(
            this.chatApi.sendMessage({
              id: `fh:mailReceived:${event.uniqueId}`,
              channel: "activity",
              to: event.targetId,
              message: {
                kind: "mailReceived",
                sender: event.entityId,
              },
            })
          );
          break;
      }
    }
    await Promise.all(work);
  }
}

export async function registerNotificationsServer<
  C extends NotificationsServerContext
>(loader: RegistryLoader<C>) {
  const [chatApi, firehose, worldApi] = await Promise.all([
    loader.get("chatApi"),
    loader.get("firehose"),
    loader.get("worldApi"),
  ]);
  return new NotificationsServer(chatApi, firehose, worldApi);
}
