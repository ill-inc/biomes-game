import type { ServerCollisionSpace } from "@/server/newton/collision";
import type { NewtonServerContext } from "@/server/newton/main";
import type { NewtonReplica } from "@/server/newton/table";
import { LooseItemSelector } from "@/server/newton/table";
import type { ShardManager } from "@/server/shared/shard_manager/api";
import { makeShardManager } from "@/server/shared/shard_manager/register";
import { shouldManageEntity } from "@/server/shared/shard_manager/util";
import type { WorldApi } from "@/server/shared/world/api";
import { BackgroundTaskController } from "@/shared/abort";
import type { ChangeToApply } from "@/shared/api/transaction";
import { changedBiomesId, ProposedChangeBuffer } from "@/shared/ecs/change";
import { LooseItem } from "@/shared/ecs/gen/components";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { add, sub } from "@/shared/math/linear";
import type { AABB, Vec3 } from "@/shared/math/types";
import {
  createCounter,
  createHistogram,
  exponentialBuckets,
} from "@/shared/metrics/metrics";
import { Timer } from "@/shared/metrics/timer";
import { DEFAULT_ENVIRONMENT_PARAMS } from "@/shared/physics/environments";
import { moveBodySimple } from "@/shared/physics/movement";
import type { Body, Constraint } from "@/shared/physics/types";
import type { RegistryLoader } from "@/shared/registry";
import { sleep } from "@/shared/util/async";
import { DefaultMap } from "@/shared/util/collections";
import { FixedLoop } from "@/shared/util/fixed_rate_ticker";
import { ok } from "assert";
import { isEqual } from "lodash";

const DROP_CONSTRAINTS: Constraint[] = [
  // Constrain drops to only move vertically.
  (_, move) => ({
    impulse: [0, move.impulse[1], 0],
    velocity: [0, move.velocity[1], 0],
  }),
];

const newtonTicks = createCounter({
  name: "newton_ticks",
  help: "Number of Newton ticks, which may include one or more fixed ticks.",
});

const newtonTickMs = createHistogram({
  name: "newton_tick_ms",
  help: "How long it takes to process each Newton tick, in milliseconds.",
  buckets: exponentialBuckets(0.005, 2, 9),
});

export class NewtonServer {
  private readonly fixedLoop: FixedLoop;
  private readonly velocities = new DefaultMap<BiomesId, Vec3>(() => [0, 0, 0]);
  private readonly changes = new ProposedChangeBuffer();
  private readonly controller = new BackgroundTaskController();
  private shardManager?: ShardManager;

  constructor(
    private readonly replica: NewtonReplica,
    private readonly collisionSpace: ServerCollisionSpace,
    private readonly worldApi: WorldApi
  ) {
    this.fixedLoop = new FixedLoop(
      () => CONFIG.newtonTickTimeMs,
      () => this.step(),
      CONFIG.newtonMaxTickCatchup
    );
  }

  async start() {
    ok(!this.shardManager);
    this.shardManager = await makeShardManager("newton");
    await this.replica.start();
    await this.collisionSpace.start();
    await this.shardManager.start();
    this.fixedLoop.start();
    this.controller.runInBackground("flush", (signal) => this.flush(signal));
    log.info("Newton server is running!");
  }

  private step() {
    if (!this.shardManager?.total) {
      // Not managing shards yet.
      return;
    }
    newtonTicks.inc();
    const timer = new Timer();
    for (const drop of this.replica.table.scan(LooseItemSelector.query.all())) {
      if (!shouldManageEntity(this.shardManager, drop.id)) {
        continue;
      }
      const body = <Body>{
        aabb: <AABB>[
          sub(drop.position.v, [0.1, 0.5, 0.1]),
          add(drop.position.v, [0.1, 0.1, 0.1]),
        ],
        velocity: this.velocities.get(drop.id),
      };
      const {
        movement: { impulse, velocity },
      } = moveBodySimple(
        CONFIG.newtonTickTimeMs / 1000,
        body,
        DEFAULT_ENVIRONMENT_PARAMS,
        this.collisionSpace.forPhysics(drop.id),
        [],
        DROP_CONSTRAINTS
      );
      if (!isEqual(impulse, [0, 0, 0])) {
        this.changes.push([
          {
            kind: "update",
            entity: {
              id: drop.id,
              position: { v: add(drop.position.v, impulse) },
            },
          },
        ]);
      }
      if (!isEqual(velocity, body.velocity)) {
        this.velocities.set(drop.id, [...velocity]);
      }
    }
    newtonTickMs.observe(timer.elapsed);
  }

  async flush(signal: AbortSignal) {
    while (await sleep(1000 / CONFIG.newtonFlushHz, signal)) {
      const batch = this.changes.pop();
      if (!batch.length) {
        continue;
      }
      const changesToApply: ChangeToApply[] = [];
      for (const change of batch) {
        const [version, entity] = this.replica.table.getWithVersion(
          changedBiomesId(change)
        );
        if (!entity) {
          continue;
        }
        // Condition the update on the loose item component still existing.
        changesToApply.push({
          iffs: [[entity.id, version, LooseItem.ID]],
          changes: [change],
        });
      }
      if (changesToApply.length > 0) {
        // TODO: Consider precondition on entity existence?
        await this.worldApi.apply(changesToApply);
      }
    }
  }

  async stop() {
    await this.shardManager?.stop();
    await this.controller.abortAndWait();
    this.collisionSpace.stop();
    this.fixedLoop.stop();
    await this.replica.stop();
  }
}

export async function registerNewtonServer<C extends NewtonServerContext>(
  loader: RegistryLoader<C>
) {
  return new NewtonServer(
    ...(await Promise.all([
      loader.get("newtonReplica"),
      loader.get("collisionSpace"),
      loader.get("worldApi"),
    ]))
  );
}
