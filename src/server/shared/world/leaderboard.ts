import { RESERVED_GREMLIN_IDS } from "@/server/gizmo/reserved_ids";
import type {
  LeaderboardCategory,
  LeaderboardItemTypes,
  LeaderboardOp,
  LeaderboardWindow,
} from "@/server/shared/world/api";
import type { Item } from "@/shared/ecs/gen/types";
import type {
  BlockDestroyEvent,
  CollectEvent,
  CraftEvent,
  FirehoseEvent,
  FishedEvent,
  PlaceEvent,
} from "@/shared/firehose/events";
import { anItem } from "@/shared/game/item";
import { stringToItemBag } from "@/shared/game/items_serde";
import type { BiomesId } from "@/shared/ids";

export type LeaderboardUpdate = [
  LeaderboardCategory,
  number,
  LeaderboardOp,
  BiomesId
];

const ALLTIME_KEY: LeaderboardWindow = "alltime";

function dateKey(date: Date) {
  return `${date.getUTCFullYear()}-${
    date.getUTCMonth() + 1
  }-${date.getUTCDate()}`;
}

function getMonday(date: Date) {
  const ret = new Date(date.getTime());
  const daysSinceMonday = (date.getUTCDay() || 7) - 1;
  if (daysSinceMonday) {
    ret.setUTCDate(ret.getUTCDate() - daysSinceMonday);
  }
  return ret;
}

export function keysForNow(): string[] {
  const now = new Date();
  return [ALLTIME_KEY, `w:${dateKey(getMonday(now))}`, dateKey(now)];
}

export function keyForWindow(window: LeaderboardWindow): string {
  const now = new Date();
  switch (window) {
    case "alltime":
      return ALLTIME_KEY;
    case "daily":
      return dateKey(now);
    case "thisWeek":
      return `w:${dateKey(getMonday(now))}`;
  }
}

function leaderboardKeysForItem(
  event:
    | CollectEvent
    | CraftEvent
    | PlaceEvent
    | BlockDestroyEvent
    | FishedEvent,
  item: Item,
  count: number
): LeaderboardUpdate[] {
  const output: LeaderboardUpdate[] = [
    [`ecs:${event.kind}:${item.id}`, count, "INCR", event.entityId],
  ];
  const leaderboardType = item.typeOnLeaderboard;
  if (leaderboardType) {
    output.push([
      `ecs:${event.kind}:${leaderboardType as LeaderboardItemTypes}`,
      1,
      "INCR",
      event.entityId,
    ]);
  }

  const fishLength = item.fishLength ?? 0;
  if (event.kind === "fished" && fishLength > 0) {
    output.push([`ecs:fished:fish`, 1, "INCR", event.entityId]);
    output.push([
      `ecs:${event.kind}:${item.id}:maxLength`,
      fishLength,
      "GT",
      event.entityId,
    ]);
  }

  return output;
}

function leaderboardFanOutBag(
  event: CollectEvent | CraftEvent | FishedEvent
): LeaderboardUpdate[] {
  let total = 0;
  let maxFishLength = 0;
  const output: LeaderboardUpdate[] = [];
  for (const { item, count: rawCount } of stringToItemBag(event.bag).values()) {
    const count = Number(rawCount);
    if (count <= 0) {
      continue;
    }
    total += count;
    maxFishLength = Math.max(item.fishLength ?? 0, maxFishLength);
    output.push(...leaderboardKeysForItem(event, item, count));
  }
  if (total > 0) {
    output.push([`ecs:${event.kind}`, total, "INCR", event.entityId]);
  }
  if (event.kind === "fished" && maxFishLength > 0) {
    output.push([
      `ecs:${event.kind}:maxLength`,
      maxFishLength,
      "GT",
      event.entityId,
    ]);
  }

  return output;
}

const GREMLIN_ID_SET = new Set(RESERVED_GREMLIN_IDS);

export function leaderboardUpdatesForEvent(
  event: FirehoseEvent
): LeaderboardUpdate[] {
  if (GREMLIN_ID_SET.has(event.entityId)) {
    return [];
  }
  switch (event.kind) {
    case "collect":
      return leaderboardFanOutBag(event);
    case "craft":
      return leaderboardFanOutBag(event);
    case "fished":
      return leaderboardFanOutBag(event);
    case "place":
      return [
        ...leaderboardKeysForItem(event, anItem(event.item), 1),
        [`ecs:place`, 1, "INCR", event.entityId],
      ];
    case "blockDestroy":
      return [
        ...leaderboardKeysForItem(event, anItem(event.block), 1),
        [`ecs:blockDestroy`, 1, "INCR", event.entityId],
      ];
    case "minigame_simple_race_finish":
      return [
        [
          `minigame:${event.minigameId}:simple_race:time`,
          event.finishTime - event.startTime,
          "LT",
          event.entityId,
        ],
      ];
    case "skillLevelUp":
    case "completeQuestStepAtEntity":
    case "completeQuestStepAtMyRobot":
    case "challengeUnlocked":
    case "recipeUnlocked":
    case "wearing":
    case "shapeBlock":
    case "npcKilled":
    case "blueprintBuilt":
    case "purchase":
    case "mapBeamRemove":
    case "pickupHandler":
    case "changePictureFrameContents":
    case "fireHeal":
    case "consume":
    case "challengeCompleted":
      return [[`ecs:${event.kind}`, 1, "INCR", event.entityId]];
    case "metaquestPoints": {
      const events: LeaderboardUpdate[] = [];
      events.push([
        `metagame:${event.metaquestId}:points`,
        event.points,
        "INCR",
        event.entityId,
      ]);
      if (event.teamId) {
        events.push([
          `metagame:${event.metaquestId}:points:team`,
          event.points,
          "INCR",
          event.teamId,
        ]);
      }
      return events;
    }

    default:
      return [[`fh:${event.kind}`, 1, "INCR", event.entityId]];
  }
}

export function leaderboardUpdatesForEvents(
  events: ReadonlyArray<FirehoseEvent>
): LeaderboardUpdate[] {
  const output: LeaderboardUpdate[] = [];
  for (const event of events) {
    output.push(...leaderboardUpdatesForEvent(event));
  }
  return output;
}
