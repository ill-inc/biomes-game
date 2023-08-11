import { zEntityFilter } from "@/server/shared/ecs/filter";
import { LazyEntity } from "@/server/shared/ecs/gen/lazy";
import type { LazyChange } from "@/server/shared/ecs/lazy";
import { makeLazyChange } from "@/server/shared/ecs/lazy";
import { HostPort } from "@/server/shared/ports";
import type {
  LeaderboardApi,
  LeaderboardCategory,
  LeaderboardOp,
  LeaderboardOrder,
  LeaderboardPosition,
  LeaderboardValueQuery,
  LeaderboardWindow,
  SubscriptionConfig,
  WorldUpdate,
} from "@/server/shared/world/api";
import {
  WorldApi,
  zLeaderboardOrder,
  zLeaderboardValueQuery,
} from "@/server/shared/world/api";
import { keyForWindow, keysForNow } from "@/server/shared/world/leaderboard";
import { InMemoryWorld } from "@/server/shared/world/shim/in_memory_world";
import { ShimSubscriptionManager } from "@/server/shared/world/shim/subscription";
import { makeClient } from "@/server/shared/zrpc/client";
import { addRetriesForUnavailable } from "@/server/shared/zrpc/retries";
import { makeClientFromImplementation } from "@/server/shared/zrpc/server";
import type { ZService } from "@/server/shared/zrpc/server_types";
import type { ApplyStatus, ChangeToApply } from "@/shared/api/transaction";
import { zApplyResult, zChangeToApply } from "@/shared/api/transaction";
import {
  WrappedEntity,
  WrappedProposedChange,
  zChange,
  zEntity,
} from "@/shared/ecs/zod";
import type { BiomesId } from "@/shared/ids";
import { zBiomesId } from "@/shared/ids";
import { autoId } from "@/shared/util/auto_id";
import {
  DefaultMap,
  findSortedInsertPosition,
} from "@/shared/util/collections";
import { assertNever } from "@/shared/util/type_helpers";
import type { RpcContext, ZClient } from "@/shared/zrpc/core";
import { reliableStream } from "@/shared/zrpc/reliable_stream";
import { zservice } from "@/shared/zrpc/service";
import { ok } from "assert";
import { remove, reverse } from "lodash";
import type { ZodType } from "zod";
import { z } from "zod";

export const zWorldSubscriptionConfig = z.object({
  filter: zEntityFilter.optional(),
}) as ZodType<SubscriptionConfig>;

export const zWorldUpdate = z.object({
  bootstrapped: z.boolean().optional(),
  changes: zChange.array().default([]),
});

const zLeaderboardOp = z.string() as ZodType<LeaderboardOp>;
const zLeaderboardCategory = z.string() as ZodType<LeaderboardCategory>;
const zLeaderboardWindow = z.string() as ZodType<LeaderboardWindow>;

export const zWorldService = zservice("world")
  .addRpc("ping", z.void(), z.void())
  .addStreamingRpc(
    "subscribe",
    zWorldSubscriptionConfig.optional(),
    zWorldUpdate
  )
  .addRpc("apply", z.array(zChangeToApply), zApplyResult)
  .addRpc(
    "get",
    zBiomesId.array(),
    z.tuple([z.number(), zEntity.optional()]).array()
  )
  .addRpc(
    "leaderboardClear",
    z.tuple([zLeaderboardCategory, zLeaderboardWindow, zBiomesId.optional()]),
    z.void()
  )
  .addRpc(
    "leaderboardRecord",
    z.tuple([zLeaderboardCategory, zLeaderboardOp, zBiomesId, z.number()]),
    z.void()
  )
  .addRpc(
    "leaderboardGet",
    z.tuple([
      zLeaderboardCategory,
      zLeaderboardWindow,
      zLeaderboardOrder,
      z.number(),
    ]),
    z.tuple([z.number(), zBiomesId, z.number()]).array()
  )
  .addRpc(
    "leaderboardGetNearby",
    z.tuple([
      zLeaderboardCategory,
      zLeaderboardWindow,
      zLeaderboardOrder,
      zBiomesId,
      z.number(),
      z.number(),
    ]),
    z.tuple([z.number(), zBiomesId, z.number()]).array().optional()
  )
  .addRpc(
    "leaderboardGetAfterScore",
    z.tuple([
      zLeaderboardCategory,
      zLeaderboardWindow,
      zLeaderboardOrder,
      z.number(),
      z.number(),
    ]),
    z.tuple([z.number(), zBiomesId, z.number()]).array()
  )
  .addRpc(
    "leaderboardGetValues",
    zLeaderboardValueQuery.array(),
    z.union([z.null(), z.tuple([z.number(), zBiomesId, z.number()])]).array()
  );

export type WorldService = ZService<typeof zWorldService>;

export class ShimWorldService implements WorldService {
  private readonly data: InMemoryWorld;
  private readonly subscriptions: ShimSubscriptionManager;
  private readonly leaderboards = new DefaultMap<
    LeaderboardCategory,
    DefaultMap<string, [BiomesId, number][]>
  >(() => new DefaultMap(() => []));

  constructor(world?: InMemoryWorld) {
    this.data = world ?? new InMemoryWorld();
    this.subscriptions = new ShimSubscriptionManager(this.data);
  }

  get writeableTable() {
    return this.data.writeableTable;
  }

  get table() {
    return this.data.table;
  }

  async ping() {}

  async apply(
    _context: RpcContext,
    changesToApply: z.infer<typeof zChangeToApply>[]
  ) {
    return this.data.apply(
      changesToApply.map((t) => ({
        ...t,
        changes: t.changes?.map((c) => c.change),
      }))
    );
  }

  async get(
    _context: RpcContext,
    ids: BiomesId[]
  ): Promise<[number, WrappedEntity | undefined][]> {
    return ids.map((id) => {
      const [tick, entity] = this.data.adaptedTable.getWithVersion(id);
      return [tick, WrappedEntity.for(entity)];
    });
  }

  subscribe(context: RpcContext, config?: SubscriptionConfig) {
    return this.subscriptions.subscribe(config, context.signal);
  }

  private internalRecord(
    category: LeaderboardCategory,
    op: LeaderboardOp,
    amount: number,
    id: BiomesId
  ) {
    const leaderboard = this.leaderboards.get(category);
    for (const key of keysForNow()) {
      const entries = leaderboard.get(key);
      const index = entries.findIndex(([eId]) => eId === id);
      if (index !== -1) {
        switch (op) {
          case "INCR":
            entries[index][1] += amount;
            break;
          case "LT":
            entries[index][1] = Math.min(entries[index][1], amount);
            break;
          case "GT":
            entries[index][1] = Math.max(entries[index][1], amount);
            break;
          default:
            assertNever(op);
        }
      } else {
        entries.push([id, amount]);
      }
      entries.sort((a, b) => b[1] - a[1]);
    }
  }

  async leaderboardClear(
    _context: RpcContext | undefined,
    [category, window, result]: [
      LeaderboardCategory,
      LeaderboardWindow,
      BiomesId | undefined
    ]
  ): Promise<void> {
    const board = this.leaderboards.get(category).get(keyForWindow(window));
    if (result !== undefined) {
      remove(board, ([id]) => id === result);
    } else {
      board.length = 0;
    }
  }

  async leaderboardRecord(
    _context: RpcContext | undefined,
    [category, op, id, amount]: [
      LeaderboardCategory,
      LeaderboardOp,
      BiomesId,
      number
    ]
  ): Promise<void> {
    this.internalRecord(category, op, amount, id);
  }

  async leaderboardGet(
    _context: RpcContext,
    [category, window, order, limit]: [
      LeaderboardCategory,
      LeaderboardWindow,
      LeaderboardOrder,
      number
    ]
  ): Promise<Array<[number, BiomesId, number]>> {
    let leaderboard = this.leaderboards.get(category).get(keyForWindow(window));

    if (order === "ASC") {
      leaderboard = reverse(leaderboard);
    }

    const ret: Array<[number, BiomesId, number]> = [];
    for (let i = 0; i < Math.min(leaderboard.length, limit); i += 1) {
      ret.push([i, leaderboard[i][0], leaderboard[i][1]]);
    }
    return ret;
  }

  async leaderboardGetAfterScore(
    _context: RpcContext,
    [category, window, order, score, count]: [
      LeaderboardCategory,
      LeaderboardWindow,
      LeaderboardOrder,
      number,
      number
    ]
  ): Promise<Array<[number, BiomesId, number]>> {
    ok(count >= 0 && count <= 50, "Too many requested");
    let leaderboard = this.leaderboards.get(category).get(keyForWindow(window));

    if (order === "ASC") {
      leaderboard = reverse(leaderboard);
    }

    const index = findSortedInsertPosition(
      leaderboard,
      score,
      (e) => e[1],
      "DESC"
    );

    if (index >= leaderboard.length) {
      return [];
    }

    const ret: Array<[number, BiomesId, number]> = [];
    for (
      let i = index;
      i < Math.min(leaderboard.length, index + count);
      i += 1
    ) {
      ret.push([i, leaderboard[i][0], leaderboard[i][1]]);
    }

    return ret;
  }

  async leaderboardGetNearby(
    _context: RpcContext,
    [category, window, order, id, aboveCount, belowCount]: [
      LeaderboardCategory,
      LeaderboardWindow,
      LeaderboardOrder,
      BiomesId,
      number,
      number
    ]
  ): Promise<Array<[number, BiomesId, number]> | undefined> {
    ok(aboveCount >= 0 && aboveCount <= 50, "Too many above requested");
    ok(belowCount >= 0 && belowCount <= 50, "Too many below requested");
    let leaderboard = this.leaderboards.get(category).get(keyForWindow(window));

    if (order === "ASC") {
      leaderboard = reverse(leaderboard);
    }
    const index = leaderboard.findIndex(([x]) => x === id);

    if (index === -1) {
      return undefined;
    }

    const ret: Array<[number, BiomesId, number]> = [];
    const start = Math.max(0, index - aboveCount);
    for (
      let i = start;
      i < Math.min(leaderboard.length, index + belowCount + 1);
      i += 1
    ) {
      ret.push([i, leaderboard[i][0], leaderboard[i][1]]);
    }

    return ret;
  }

  async leaderboardGetValues(
    _context: RpcContext,
    queries: LeaderboardValueQuery[]
  ): Promise<Array<[number, BiomesId, number] | null>> {
    const ret: Array<[number, BiomesId, number] | null> = [];

    for (const query of queries) {
      let leaderboard = this.leaderboards
        .get(query.category)
        .get(keyForWindow(query.window));

      if (query.order === "ASC") {
        leaderboard = reverse(leaderboard);
      }

      const index = leaderboard.findIndex(([x]) => x === query.id);
      if (index === -1) {
        ret.push(null);
      } else {
        ret.push([index, query.id, leaderboard[index][1]]);
      }
    }

    return ret;
  }
}

export class ShimLeaderboard implements LeaderboardApi {
  constructor(private readonly client: ZClient<typeof zWorldService>) {}

  async clear(
    category: LeaderboardCategory,
    window: "daily" | "thisWeek" | "alltime",
    result?: BiomesId
  ): Promise<void> {
    return this.client.leaderboardClear([category, window, result]);
  }

  async record(
    category: LeaderboardCategory,
    op: LeaderboardOp,
    id: BiomesId,
    amount: number
  ): Promise<void> {
    return this.client.leaderboardRecord([category, op, id, amount]);
  }

  async get(
    category: LeaderboardCategory,
    window: LeaderboardWindow,
    order: LeaderboardOrder,
    limit: number
  ): Promise<LeaderboardPosition[]> {
    const ret = await this.client.leaderboardGet([
      category,
      window,
      order,
      limit,
    ]);
    return ret.map((e) => ({
      rank: e[0],
      id: e[1],
      value: e[2],
    }));
  }

  async getAfterScore(
    category: LeaderboardCategory,
    window: LeaderboardWindow,
    order: LeaderboardOrder,
    score: number,
    count: number
  ): Promise<LeaderboardPosition[]> {
    const ret = await this.client.leaderboardGetAfterScore([
      category,
      window,
      order,
      score,
      count,
    ]);
    return ret.map((e) => ({
      rank: e[0],
      id: e[1],
      value: e[2],
    }));
  }

  async getNearby(
    category: LeaderboardCategory,
    window: LeaderboardWindow,
    order: LeaderboardOrder,
    id: BiomesId,
    aboveCount: number,
    belowCount: number
  ): Promise<LeaderboardPosition[] | undefined> {
    return (
      await this.client.leaderboardGetNearby([
        category,
        window,
        order,
        id,
        aboveCount,
        belowCount,
      ])
    )?.map((e) => ({
      rank: e[0],
      id: e[1],
      value: e[2],
    }));
  }

  async getValues(
    queries: LeaderboardValueQuery[]
  ): Promise<Array<LeaderboardPosition | undefined>> {
    return (await this.client.leaderboardGetValues(queries))?.map((e) =>
      e
        ? {
            rank: e[0],
            id: e[1],
            value: e[2],
          }
        : undefined
    );
  }
}

export class ShimWorldApi extends WorldApi {
  private readonly client: ZClient<typeof zWorldService>;

  constructor(client?: ZClient<typeof zWorldService>) {
    super();
    this.client =
      client ??
      addRetriesForUnavailable(
        zWorldService,
        makeClient(zWorldService, HostPort.forShim().rpc)
      );
  }

  async stop() {
    await this.client.close();
  }

  static createForService(service: ShimWorldService): WorldApi {
    return new ShimWorldApi(
      makeClientFromImplementation(zWorldService, service)
    );
  }

  static createForWorld(world: InMemoryWorld): WorldApi {
    return ShimWorldApi.createForService(new ShimWorldService(world));
  }

  async healthy(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  leaderboard(): LeaderboardApi {
    return new ShimLeaderboard(this.client);
  }

  async _getWithVersion(
    ids: BiomesId[]
  ): Promise<[number, LazyEntity | undefined][]> {
    return (await this.client.get(ids)).map(
      ([tick, wrapped]) =>
        [tick, wrapped ? LazyEntity.forDecoded(wrapped.entity) : undefined] as [
          number,
          LazyEntity | undefined
        ]
    );
  }

  async *subscribe(
    config?: SubscriptionConfig | undefined,
    signal?: AbortSignal | undefined
  ): AsyncIterable<WorldUpdate> {
    const id = `shim-world-${autoId()}`;
    for await (const { bootstrapped, changes } of reliableStream(
      id,
      (...args) => this.client.subscribe(...args),
      async () => {
        await this.client.waitForReady(Infinity, signal);
        return config;
      },
      signal
    )) {
      yield {
        bootstrapped: bootstrapped,
        changes: changes.map(({ change }) => makeLazyChange(change)),
      };
    }
  }

  async _apply(
    changesToApply: ChangeToApply[]
  ): Promise<{ outcomes: ApplyStatus[]; changes: LazyChange[] }> {
    const [outcomes, eagerChanges] = await this.client.apply(
      changesToApply.map((t) => ({
        ...t,
        changes: t.changes?.map((c) => new WrappedProposedChange(c)),
      }))
    );
    return {
      outcomes,
      changes: eagerChanges.map(({ change }) => makeLazyChange(change)),
    };
  }
}
