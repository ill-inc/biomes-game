import type { EntityFilter } from "@/server/shared/ecs/filter";
import type { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import type { LazyChange } from "@/server/shared/ecs/lazy";
import { WorldEditor } from "@/server/shared/world/editor";
import type { FilterContext } from "@/server/shared/world/filter_context";
import type { ApplyStatus, ChangeToApply } from "@/shared/api/transaction";
import type { FirehoseEvent } from "@/shared/firehose/events";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import { Timer } from "@/shared/metrics/timer";
import { sleep } from "@/shared/util/async";
import { BackoffDelay } from "@/shared/util/retry_helpers";
import { isArray } from "lodash";
import type { ZodType } from "zod";
import { z } from "zod";

export interface SubscriptionConfig {
  filter?: EntityFilter;
  skipBootstrap?: boolean;
}

export interface WorldUpdate {
  bootstrapped?: boolean;
  changes: LazyChange[];
}

export type LeaderboardItemTypes = "wearable" | "block" | "fish";

export type LeaderboardCategory =
  | "playTime"
  | `minigame:${BiomesId}:simple_race:time`
  | `fh:${FirehoseEvent["kind"]}`
  | `ecs:${FirehoseEvent["kind"]}`
  | `ecs:collect:${LeaderboardItemTypes | BiomesId}`
  | `ecs:fished:${LeaderboardItemTypes | BiomesId}`
  | `ecs:fished:maxLength`
  | `ecs:fished:${BiomesId}:maxLength`
  | `ecs:craft:${LeaderboardItemTypes | BiomesId}`
  | `ecs:place:${LeaderboardItemTypes | BiomesId}`
  | `ecs:blockDestroy:${LeaderboardItemTypes | BiomesId}`
  | `metagame:${BiomesId}:points`
  | `metagame:${BiomesId}:points:team`;

export const zLeaderboardWindow = z.enum(["daily", "thisWeek", "alltime"]);
export type LeaderboardWindow = z.infer<typeof zLeaderboardWindow>;

export type LeaderboardOp = "LT" | "INCR" | "GT";

export const zLeaderboardOrder = z.enum(["ASC", "DESC"]);
export type LeaderboardOrder = z.infer<typeof zLeaderboardOrder>;

export const zLeaderboardPosition = z.object({
  rank: z.number(),
  id: zBiomesId,
  value: z.number(),
});

export type LeaderboardPosition = z.infer<typeof zLeaderboardPosition>;

export const zLeaderboardValueQuery = z.object({
  category: z.string() as ZodType<LeaderboardCategory>,
  window: zLeaderboardWindow,
  order: zLeaderboardOrder,
  id: zBiomesId,
});

export type LeaderboardValueQuery = z.infer<typeof zLeaderboardValueQuery>;

export interface LeaderboardApi {
  clear(
    category: LeaderboardCategory,
    window: LeaderboardWindow,
    result?: BiomesId
  ): Promise<void>;

  record(
    category: LeaderboardCategory,
    op: LeaderboardOp,
    id: BiomesId,
    amount?: number
  ): Promise<void>;
  get(
    category: LeaderboardCategory,
    window: LeaderboardWindow,
    order: LeaderboardOrder,
    limit?: number
  ): Promise<Array<LeaderboardPosition>>;
  getAfterScore(
    category: LeaderboardCategory,
    window: LeaderboardWindow,
    order: LeaderboardOrder,
    score: number,
    count: number
  ): Promise<Array<LeaderboardPosition>>;
  getNearby(
    category: LeaderboardCategory,
    window: LeaderboardWindow,
    order: LeaderboardOrder,
    id: BiomesId,
    aboveCount: number,
    belowCount: number
  ): Promise<Array<LeaderboardPosition> | undefined>;

  getValues(
    queries: LeaderboardValueQuery[]
  ): Promise<Array<LeaderboardPosition | undefined>>;
}

export abstract class WorldApi {
  async waitForHealthy(
    timeoutMs: number = Infinity,
    signal?: AbortSignal
  ): Promise<boolean> {
    const backoff = new BackoffDelay({
      baseMs: 100,
      maxMs: 5000,
    });
    const timer = new Timer();
    while (timer.elapsed <= timeoutMs) {
      if (!(await sleep(backoff.ms, signal))) {
        break;
      }
      if (await this.healthy()) {
        return true;
      }
      backoff.incrementDelay();
    }
    return false;
  }

  edit(): WorldEditor {
    return new WorldEditor(this);
  }

  get(id: BiomesId): Promise<LazyEntity | undefined>;
  get(ids: BiomesId[]): Promise<(LazyEntity | undefined)[]>;
  async get(
    idsOrId: BiomesId | BiomesId[]
  ): Promise<LazyEntity | undefined | (LazyEntity | undefined)[]> {
    let singleOutput = false;
    if (!Array.isArray(idsOrId)) {
      idsOrId = [idsOrId];
      singleOutput = true;
    } else if (idsOrId.length === 0) {
      return [];
    }
    const result = await this.getWithVersion(idsOrId);
    return singleOutput ? result[0][1] : result.map(([, entity]) => entity);
  }

  getWithVersion(id: BiomesId): Promise<[number, LazyEntity | undefined]>;
  getWithVersion(ids: BiomesId[]): Promise<[number, LazyEntity | undefined][]>;
  async getWithVersion(
    idsOrId: BiomesId | BiomesId[]
  ): Promise<
    [number, LazyEntity | undefined] | [number, LazyEntity | undefined][]
  > {
    let singleOutput = false;
    if (!Array.isArray(idsOrId)) {
      idsOrId = [idsOrId];
      singleOutput = true;
    } else if (idsOrId.length === 0) {
      return [];
    }
    const result = await this._getWithVersion(idsOrId);
    return singleOutput ? result[0] : result;
  }

  has(id: BiomesId): Promise<BiomesId | undefined>;
  has(ids: BiomesId[]): Promise<BiomesId[]>;
  has(ids: BiomesId | BiomesId[]): Promise<BiomesId[] | BiomesId | undefined>;
  async has(
    ids: BiomesId | BiomesId[]
  ): Promise<BiomesId[] | BiomesId | undefined> {
    let singleId = false;
    if (!isArray(ids)) {
      ids = [ids];
      singleId = true;
    }
    const matches = (await this.get(ids)).map((e) => !!e);
    const results = ids.filter((_, i) => matches[i]);
    if (singleId) {
      return results.length > 0 ? results[0] : undefined;
    }
    return results;
  }

  async apply(
    changeToApply: ChangeToApply
  ): Promise<{ outcome: ApplyStatus; changes: LazyChange[] }>;
  async apply(
    changesToApply: ChangeToApply[]
  ): Promise<{ outcomes: ApplyStatus[]; changes: LazyChange[] }>;
  async apply(
    changesToApply: ChangeToApply | ChangeToApply[]
  ): Promise<
    | { outcome: ApplyStatus; changes: LazyChange[] }
    | { outcomes: ApplyStatus[]; changes: LazyChange[] }
  > {
    if (!Array.isArray(changesToApply)) {
      const result = await this._apply([changesToApply]);
      return {
        outcome: result.outcomes[0],
        changes: result.changes,
      };
    } else if (changesToApply.length === 0) {
      return {
        outcomes: [],
        changes: [],
      };
    }
    return this._apply(changesToApply);
  }

  //
  // These methods are intended to be implemented by subclasses to fully support
  // the WorldApi implementation above.
  //

  abstract healthy(): Promise<boolean>;

  async stop(): Promise<void> {}

  abstract leaderboard(): LeaderboardApi;

  abstract subscribe(
    config?: SubscriptionConfig,
    signal?: AbortSignal
  ): AsyncIterable<WorldUpdate> & { filterContext?: FilterContext };

  protected abstract _getWithVersion(
    ids: BiomesId[]
  ): Promise<[number, LazyEntity | undefined][]>;

  protected abstract _apply(
    changesToApply: ChangeToApply[]
  ): Promise<{ outcomes: ApplyStatus[]; changes: LazyChange[] }>;
}
