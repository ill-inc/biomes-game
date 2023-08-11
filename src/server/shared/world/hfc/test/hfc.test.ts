import type { LazyChange } from "@/server/shared/ecs/lazy";
import { LazyChangeBuffer } from "@/server/shared/ecs/lazy";
import type { ReadonlyFilterContext } from "@/server/shared/world/filter_context";
import { HfcWorldApi } from "@/server/shared/world/hfc/hfc";
import {
  redisInitForTests,
  runRedis,
} from "@/server/shared/world/test/test_helpers";
import { BackgroundTaskController } from "@/shared/abort";
import type { BiomesId } from "@/shared/ids";
import { Latch } from "@/shared/util/async";
import assert, { ok } from "assert";

const ID_A = 1 as BiomesId;
const ID_B = 2 as BiomesId;

describe("HFC World Tests", () => {
  if (process.env.REDIS_TESTS !== "1") {
    it("are being skipped as we lack env.REDIS_TESTS=1", () => {
      assert.ok(true);
    });
    return;
  }

  let port!: number;
  let controller!: AbortController;
  before(async () => {
    [port, controller] = await runRedis();
  });

  after(async () => {
    controller?.abort();
  });

  let world!: HfcWorldApi;
  beforeEach(async () => {
    world = new HfcWorldApi(await redisInitForTests(port));
  });

  afterEach(async () => {
    await world.stop();
  });

  it("Can be healthy", async () => {
    assert.ok(await world.healthy());
  });

  it("Can store a HFC component", async () => {
    assert.equal(await world.get(ID_A), undefined);

    await world.apply({
      changes: [
        {
          kind: "create",
          entity: {
            id: ID_A,
            position: { v: [1, 2, 3] },
          },
        },
      ],
    });

    const entity = await world.get(ID_A);
    assert.ok(entity);
    assert.deepEqual(entity?.position()?.v, [1, 2, 3]);
  });

  it("Supports subscription", async () => {
    const controller = new BackgroundTaskController();
    const gotUpdate = new Latch();
    const bootstrapped = new Latch();
    const buffer = new LazyChangeBuffer();

    controller.runInBackground("subscribe", async (signal) => {
      for await (const update of world.subscribe({}, signal)) {
        buffer.push(update.changes);
        gotUpdate.signal();
        if (update.bootstrapped) {
          bootstrapped.signal();
        }
      }
    });

    try {
      await bootstrapped.wait();

      gotUpdate.reset();
      await world.apply({
        changes: [
          {
            kind: "create",
            entity: {
              id: ID_A,
              position: { v: [1, 2, 3] },
            },
          },
        ],
      });
      await gotUpdate.wait();

      const changes = buffer.pop();
      assert.equal(changes.length, 1);
      const change = changes[0];
      ok(change.kind === "create");
      assert.equal(change.entity.id, ID_A);
      assert.deepEqual(change.entity.position(), { v: [1, 2, 3] });
    } finally {
      controller.abort();
    }
  });

  it("Supports subscription with filter", async () => {
    const controller = new BackgroundTaskController();
    const gotUpdate = new Latch();
    const bootstrapped = new Latch();
    const buffer = new LazyChangeBuffer();

    const filter = {
      filter: (changes: LazyChange[]) =>
        changes.filter(
          (change) => change.kind === "create" && change.entity.id === ID_A
        ),
    } satisfies ReadonlyFilterContext;

    controller.runInBackground("subscribe", async (signal) => {
      for await (const update of world.subscribe(
        {
          externalFilterContext: filter,
        },
        signal
      )) {
        buffer.push(update.changes);
        gotUpdate.signal();
        if (update.bootstrapped) {
          bootstrapped.signal();
        }
      }
    });

    try {
      await bootstrapped.wait();

      gotUpdate.reset();
      await world.apply({
        changes: [
          {
            kind: "create",
            entity: {
              id: ID_A,
              position: { v: [1, 2, 3] },
            },
          },
          {
            kind: "create",
            entity: {
              id: ID_B,
              position: { v: [4, 5, 6] },
            },
          },
        ],
      });
      await gotUpdate.wait();

      const changes = buffer.pop();
      assert.equal(changes.length, 1);
      const change = changes[0];
      ok(change.kind === "create");
      assert.equal(change.entity.id, ID_A);
      assert.deepEqual(change.entity.position(), { v: [1, 2, 3] });
    } finally {
      controller.abort();
    }
  });
});
