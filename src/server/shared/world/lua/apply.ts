import type { LazyChange } from "@/server/shared/ecs/lazy";
import { stateToLazyChange } from "@/server/shared/ecs/lazy";
import type { BiomesRedisConnection } from "@/server/shared/redis/types";
import type { LeaderboardUpdate } from "@/server/shared/world/leaderboard";
import {
  keysForNow,
  leaderboardUpdatesForEvent,
} from "@/server/shared/world/leaderboard";
import {
  deserializeRedisEntityState,
  packForRedis,
  parseTick,
  serializeRedisEntity,
  unpackFromRedis,
} from "@/server/shared/world/lua/serde";
import { leaderboardKey } from "@/server/shared/world/redis_leaderboard";
import { TICK_KEY, biomesIdToRedisKey } from "@/server/shared/world/types";
import type { ApplyStatus, ChangeToApply } from "@/shared/api/transaction";
import type { ProposedChange } from "@/shared/ecs/change";
import { changedBiomesId } from "@/shared/ecs/change";
import { KIND_TO_ID } from "@/shared/ecs/serde";
import type { BiomesId } from "@/shared/ids";
import { parseBiomesId } from "@/shared/ids";
import { createCounter, createGauge } from "@/shared/metrics/metrics";
import { zrpcSerialize } from "@/shared/zrpc/serde";
import { ok } from "assert";

export type RedisApplyMethods = {
  // ECSAPPLYBUFFER
  // - numKeys: 1 + Number of total IDs in transactions
  // - keys: [tickKey, ...ids] (tickKey is always first)
  // - args: [changesToApply]
  ecsApplyBuffer: (
    numKeys: number,
    ...keysAndRequest: Buffer[]
  ) => Promise<Buffer>;
};

function determineUsedKeys(changesToApply: ChangeToApply[]): Buffer[] {
  const ids = new Set<BiomesId>();
  for (const changeToApply of changesToApply) {
    if (changeToApply.iffs) {
      for (const iff of changeToApply.iffs) {
        ids.add(iff[0]);
      }
    }
    if (changeToApply.changes) {
      for (const change of changeToApply.changes) {
        ids.add(changedBiomesId(change));
      }
    }
    if (changeToApply.catchups) {
      for (const [id] of changeToApply.catchups) {
        ids.add(id);
      }
    }
  }
  return Array.from(ids, biomesIdToRedisKey);
}

// Redis doesn't need to understand the actual body of components to manipulate them,
// this also helps with compatibility issues roundtripping from Lua.
export function proposedChangeToRedis(change: ProposedChange): any {
  switch (change.kind) {
    case "delete":
      ok(typeof change.id === "number", "Invalid change entity ID");
      return [KIND_TO_ID["delete"], change.id];
    case "update":
    case "create":
      const kind = KIND_TO_ID[change.kind];
      ok(typeof kind === "number", "Invalid change kind");
      ok(typeof change.entity.id === "number", "Invalid change entity ID");
      return [kind, change.entity.id, serializeRedisEntity(change.entity)];
  }
}

export function changeToApplyToRedis(changesToApply: ChangeToApply[]): Buffer {
  return packForRedis({
    now: Date.now(),
    cta: changesToApply.map((changeToApply) => {
      let leaderboards: LeaderboardUpdate[] | undefined;
      if (changeToApply.events) {
        // Compute the leaderboard changes implied by the given events.
        for (const event of changeToApply.events) {
          const updates = leaderboardUpdatesForEvent(event);
          if (updates.length === 0) {
            continue;
          }
          leaderboards ??= [];
          for (const key of keysForNow()) {
            leaderboards.push(
              ...updates.map(
                ([category, count, op, id]) =>
                  [
                    leaderboardKey(category, key),
                    count,
                    op,
                    id,
                  ] as LeaderboardUpdate
              )
            );
          }
        }
      }
      return {
        iffs: changeToApply.iffs,
        changes: changeToApply.changes?.map((c) => proposedChangeToRedis(c)),
        events: changeToApply.events?.map((e) =>
          zrpcSerialize(e).toString("binary")
        ),
        leaderboards,
        catchups: changeToApply.catchups,
      };
    }),
  });
}

export function redisToApplyResult(
  bytes: Buffer | Uint8Array
): [outcomes: ApplyStatus[], changes: LazyChange[]] {
  const { outcomes, eagerStates } = unpackFromRedis(bytes);
  return [
    outcomes.map((outcome: any) =>
      outcome === "aborted" ? "aborted" : "success"
    ),
    (eagerStates as any[]).map(([rawId, state]) => {
      const id = parseBiomesId(rawId);
      const [rawTick, entity] = deserializeRedisEntityState(id, state);
      const tick = parseTick(rawTick);
      return stateToLazyChange(id, tick, entity);
    }),
  ];
}

const applyAffectedKeys = createCounter({
  name: `redis_apply_affected_keys`,
  help: "Number of keys affected by an apply",
  labelNames: ["type"],
});

const applyBasedChanges = createCounter({
  name: `redis_apply_changes`,
  help: "Number of changed entities by an apply",
  labelNames: ["type"],
});

const applyMaxAffectedKeys = createGauge({
  name: `redis_apply_max_affected_keys`,
  help: "Maximum number of keys affected by an apply",
  labelNames: ["type"],
});

export class ApplyMetrics {
  private max = 0;

  constructor(private readonly type: string) {}

  observe(changesToApply: ChangeToApply[]) {
    applyBasedChanges.inc(
      { type: this.type },
      changesToApply.reduce((sum, c) => sum + (c.changes?.length ?? 0), 0)
    );
    const keys = determineUsedKeys(changesToApply);
    applyAffectedKeys.inc({ type: this.type }, keys.length);
    const oldMax = this.max;
    this.max = Math.max(this.max, keys.length);
    if (this.max !== oldMax) {
      applyMaxAffectedKeys.set({ type: this.type }, this.max);
    }
    return keys;
  }
}

const applyMetrics = new ApplyMetrics("rc");

export async function apply(
  redis: BiomesRedisConnection & RedisApplyMethods,
  changesToApply: ChangeToApply[]
): Promise<[outcomes: ApplyStatus[], changes: LazyChange[]]> {
  if (changesToApply.length === 0) {
    return [[], []];
  }
  const keys = applyMetrics.observe(changesToApply);
  ok(
    keys.length <= CONFIG.redisMaxKeysPerBatch,
    `Too many keys to apply: ${keys.length}`
  );
  const result = await redis.ecsApplyBuffer(
    keys.length + 1,
    TICK_KEY,
    ...keys,
    changeToApplyToRedis(changesToApply)
  );
  return redisToApplyResult(result);
}
